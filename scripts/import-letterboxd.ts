/**
 * Importe un export Letterboxd (.zip ou dossier extrait) dans la base Dreams.
 *
 *   npm run import -- "C:\chemin\vers\letterboxd-xxx.zip"
 *
 * On peut relancer l'import autant de fois qu'on veut : les données Letterboxd
 * sont remplacées, mais les infos TMDB déjà récupérées et les critiques écrites
 * dans Dreams sont conservées.
 */
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { db, ensureSchema } from "../src/lib/db";

type Row = Record<string, string>;

const source = process.argv[2];
if (!source) {
  console.error('Usage : npm run import -- "chemin/vers/export.zip"');
  process.exit(1);
}

// Lit tous les CSV de l'export, qu'il soit zippé ou déjà extrait.
function readExport(src: string): Map<string, string> {
  const files = new Map<string, string>();
  if (fs.statSync(src).isDirectory()) {
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".csv"))
          files.set(path.relative(src, full).replaceAll("\\", "/"), fs.readFileSync(full, "utf8"));
      }
    };
    walk(src);
  } else {
    for (const entry of new AdmZip(src).getEntries()) {
      if (!entry.isDirectory && entry.entryName.endsWith(".csv"))
        files.set(entry.entryName, entry.getData().toString("utf8"));
    }
  }
  return files;
}

const csv = (text: string | undefined): Row[] =>
  text ? parse(text, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true }) : [];

const num = (v: string | undefined) => (v ? Number(v) : null);
const filmKey = (name: string, year: string | undefined) => `${name}|${year ?? ""}`;

async function main() {
  const files = readExport(source);
  if (!files.has("watched.csv")) throw new Error("watched.csv introuvable : est-ce bien un export Letterboxd ?");
  await ensureSchema();
  const client = db();

  // 1. Tous les films mentionnés, quel que soit le fichier.
  const films = new Map<string, { name: string; year: string; uri?: string }>();
  const addFilm = (r: Row, uriIsFilm = false) => {
    const key = filmKey(r.Name, r.Year);
    const existing = films.get(key);
    const uri = uriIsFilm ? r["Letterboxd URI"] ?? r.URL : undefined;
    if (!existing) films.set(key, { name: r.Name, year: r.Year, uri });
    else if (uri && !existing.uri) existing.uri = uri;
  };

  const watched = csv(files.get("watched.csv"));
  const ratings = csv(files.get("ratings.csv"));
  const likes = csv(files.get("likes/films.csv"));
  const watchlist = csv(files.get("watchlist.csv"));
  const diary = csv(files.get("diary.csv"));
  const reviews = csv(files.get("reviews.csv"));
  [watched, ratings, likes, watchlist].forEach((rows) => rows.forEach((r) => addFilm(r, true)));
  [diary, reviews].forEach((rows) => rows.forEach((r) => addFilm(r)));

  // Les listes ont un format spécial : un en-tête, une ligne vide, puis les films.
  const lists: { slug: string; name: string; description: string; date: string; items: Row[] }[] = [];
  for (const [name, text] of files) {
    if (!name.startsWith("lists/")) continue;
    const [head, body] = text.split(/\r?\n\r?\n/, 2);
    const meta = csv(head.split(/\r?\n/).slice(1).join("\n"))[0];
    const items = csv(body);
    items.forEach((r) => addFilm(r, true));
    lists.push({ slug: path.basename(name, ".csv"), name: meta?.Name ?? name, description: meta?.Description ?? "", date: meta?.Date ?? "", items });
  }

  await client.batch(
    [...films.entries()].map(([key, f]) => ({
      sql: `INSERT INTO films (key, name, year, lb_uri) VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET lb_uri = COALESCE(excluded.lb_uri, films.lb_uri)`,
      args: [key, f.name, num(f.year), f.uri ?? null],
    })),
    "write",
  );

  const idRows = await client.execute("SELECT id, key FROM films");
  const ids = new Map(idRows.rows.map((r) => [r.key as string, Number(r.id)]));
  const id = (r: Row) => ids.get(filmKey(r.Name, r.Year))!;

  // 2. On remplace les données Letterboxd (les critiques écrites dans Dreams restent).
  await client.batch(
    [
      "DELETE FROM watched", "DELETE FROM ratings", "DELETE FROM likes", "DELETE FROM watchlist",
      "DELETE FROM diary", "DELETE FROM reviews WHERE source = 'letterboxd'",
      "DELETE FROM lists", "DELETE FROM list_items",
    ],
    "write",
  );

  await client.batch(
    [
      ...watched.map((r) => ({ sql: "INSERT OR REPLACE INTO watched VALUES (?, ?)", args: [id(r), r.Date] })),
      ...ratings.map((r) => ({ sql: "INSERT OR REPLACE INTO ratings VALUES (?, ?, ?)", args: [id(r), num(r.Rating), r.Date] })),
      ...likes.map((r) => ({ sql: "INSERT OR REPLACE INTO likes VALUES (?, ?)", args: [id(r), r.Date] })),
      ...watchlist.map((r) => ({ sql: "INSERT OR REPLACE INTO watchlist VALUES (?, ?)", args: [id(r), r.Date] })),
      ...diary.map((r) => ({
        sql: "INSERT INTO diary (film_id, logged_date, watched_date, rating, rewatch, tags) VALUES (?, ?, ?, ?, ?, ?)",
        args: [id(r), r.Date, r["Watched Date"] || r.Date, num(r.Rating), r.Rewatch === "Yes" ? 1 : 0, r.Tags || null],
      })),
      ...reviews.map((r) => ({
        sql: "INSERT INTO reviews (film_id, date, watched_date, rating, rewatch, review, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [id(r), r.Date, r["Watched Date"] || r.Date, num(r.Rating), r.Rewatch === "Yes" ? 1 : 0, r.Review, r.Tags || null],
      })),
      ...lists.flatMap((l) => [
        { sql: "INSERT INTO lists VALUES (?, ?, ?, ?)", args: [l.slug, l.name, l.description, l.date] },
        ...l.items.map((r) => ({
          sql: "INSERT OR IGNORE INTO list_items VALUES (?, ?, ?)",
          args: [l.slug, id(r), num(r.Position)],
        })),
      ]),
    ],
    "write",
  );

  console.log(`✅ Import terminé :
  ${films.size} films au total
  ${watched.length} vus · ${ratings.length} notes · ${likes.length} coups de cœur
  ${diary.length} entrées de journal · ${reviews.length} critiques
  ${watchlist.length} films en watchlist · ${lists.length} listes
Étape suivante : npm run enrich (récupère affiches et infos sur TMDB)`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
