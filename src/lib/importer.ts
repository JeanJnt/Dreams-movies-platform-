import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { db, ensureSchema } from "./db";

/*
 * Import d'un export Letterboxd (.zip) dans le compte d'un membre.
 * Relançable autant de fois qu'on veut : les données Letterboxd du membre sont remplacées,
 * mais ses critiques écrites dans Dreams, sa collection, son agenda… sont conservés.
 */

type Row = Record<string, string>;

// Garde-fous contre un fichier piégé (« zip bomb ») : taille et nombre de fichiers limités.
const MAX_ZIP = 30 * 1024 * 1024;
const MAX_UNZIPPED = 80 * 1024 * 1024;
const MAX_ENTRIES = 500;

export type ImportSummary = { username: string | null; films: number; watched: number; ratings: number; likes: number; diary: number; reviews: number; watchlist: number; lists: number };

function readZip(buffer: Buffer): Map<string, string> {
  if (buffer.length > MAX_ZIP) throw new Error("Fichier trop lourd (30 Mo maximum).");
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new Error("Ce fichier n'est pas un .zip valide.");
  }
  const entries = zip.getEntries();
  if (entries.length > MAX_ENTRIES) throw new Error("Archive inattendue (trop de fichiers).");
  let total = 0;
  const files = new Map<string, string>();
  for (const entry of entries) {
    if (entry.isDirectory || !entry.entryName.endsWith(".csv")) continue;
    total += entry.header.size;
    if (total > MAX_UNZIPPED) throw new Error("Archive inattendue (trop volumineuse une fois décompressée).");
    // On ne garde que le chemin relatif « propre » (pas de ../)
    const name = entry.entryName.replace(/\\/g, "/").replace(/^\/+/, "");
    if (name.includes("..")) continue;
    files.set(name, entry.getData().toString("utf8"));
  }
  return files;
}

const csv = (text: string | undefined): Row[] =>
  text ? parse(text, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true }) : [];

const num = (v: string | undefined) => (v && !Number.isNaN(Number(v)) ? Number(v) : null);
const filmKey = (name: string, year: string | undefined) => `${name}|${year ?? ""}`;
const clip = (s: string | undefined, max: number) => (s ?? "").slice(0, max);

export async function importLetterboxd(userId: number, zip: Buffer): Promise<ImportSummary> {
  await ensureSchema();
  const files = readZip(zip);
  if (!files.has("watched.csv")) throw new Error("watched.csv introuvable : est-ce bien l'export Letterboxd (Settings → Import & Export) ?");
  const client = db();
  const u = Number(userId);

  // 1. Tous les films mentionnés, quel que soit le fichier.
  const films = new Map<string, { name: string; year: string; uri?: string }>();
  const addFilm = (r: Row, uriIsFilm = false) => {
    if (!r.Name) return;
    const key = filmKey(clip(r.Name, 300), r.Year);
    const existing = films.get(key);
    const uri = uriIsFilm ? r["Letterboxd URI"] ?? r.URL : undefined;
    const safeUri = uri && /^https:\/\/(boxd\.it|letterboxd\.com)\//.test(uri) ? uri : undefined;
    if (!existing) films.set(key, { name: clip(r.Name, 300), year: r.Year, uri: safeUri });
    else if (safeUri && !existing.uri) existing.uri = safeUri;
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
    const slug = name.slice(6, -4).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 80) || `liste-${lists.length + 1}`;
    lists.push({ slug, name: clip(meta?.Name ?? slug, 200), description: clip(meta?.Description, 2000), date: clip(meta?.Date, 20), items });
  }

  // Le catalogue de films est partagé entre membres : on ajoute seulement ceux qui manquent.
  const entries = [...films.entries()];
  for (let i = 0; i < entries.length; i += 500) {
    await client.batch(
      entries.slice(i, i + 500).map(([key, f]) => ({
        sql: `INSERT INTO films (key, name, year, lb_uri) VALUES (?, ?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET lb_uri = COALESCE(films.lb_uri, excluded.lb_uri)`,
        args: [key, f.name, num(f.year), f.uri ?? null],
      })),
      "write",
    );
  }
  const idRows = await client.execute("SELECT id, key FROM films");
  const ids = new Map(idRows.rows.map((r) => [r.key as string, Number(r.id)]));
  const id = (r: Row) => ids.get(filmKey(clip(r.Name, 300), r.Year));

  // 2. On remplace les données Letterboxd de CE membre uniquement.
  const statements = [
    ...["watched", "ratings", "likes", "watchlist", "diary", "lists", "list_items"].map((t) => ({ sql: `DELETE FROM ${t} WHERE user_id = ?`, args: [u] })),
    { sql: "DELETE FROM reviews WHERE user_id = ? AND source = 'letterboxd'", args: [u] },
    ...watched.filter(id).map((r) => ({ sql: "INSERT OR REPLACE INTO watched (user_id, film_id, date) VALUES (?, ?, ?)", args: [u, id(r)!, r.Date] })),
    ...ratings.filter(id).map((r) => ({ sql: "INSERT OR REPLACE INTO ratings (user_id, film_id, rating, date) VALUES (?, ?, ?, ?)", args: [u, id(r)!, num(r.Rating), r.Date] })),
    ...likes.filter(id).map((r) => ({ sql: "INSERT OR REPLACE INTO likes (user_id, film_id, date) VALUES (?, ?, ?)", args: [u, id(r)!, r.Date] })),
    ...watchlist.filter(id).map((r) => ({ sql: "INSERT OR REPLACE INTO watchlist (user_id, film_id, date) VALUES (?, ?, ?)", args: [u, id(r)!, r.Date] })),
    ...diary.filter(id).map((r) => ({
      sql: "INSERT INTO diary (user_id, film_id, logged_date, watched_date, rating, rewatch, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [u, id(r)!, r.Date, r["Watched Date"] || r.Date, num(r.Rating), r.Rewatch === "Yes" ? 1 : 0, clip(r.Tags, 500) || null],
    })),
    ...reviews.filter(id).map((r) => ({
      sql: "INSERT INTO reviews (user_id, film_id, date, watched_date, rating, rewatch, review, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [u, id(r)!, r.Date, r["Watched Date"] || r.Date, num(r.Rating), r.Rewatch === "Yes" ? 1 : 0, clip(r.Review, 50_000), clip(r.Tags, 500) || null],
    })),
    ...lists.flatMap((l) => [
      { sql: "INSERT OR REPLACE INTO lists (user_id, slug, name, description, date) VALUES (?, ?, ?, ?, ?)", args: [u, l.slug, l.name, l.description, l.date] },
      ...l.items.filter(id).map((r) => ({
        sql: "INSERT OR IGNORE INTO list_items (user_id, list_slug, film_id, position) VALUES (?, ?, ?, ?)",
        args: [u, l.slug, id(r)!, num(r.Position)],
      })),
    ]),
  ];
  await client.batch(statements, "write");

  // Le pseudo Letterboxd (profile.csv), pour proposer ensuite la synchronisation automatique.
  const username = csv(files.get("profile.csv"))[0]?.Username?.trim() || null;

  return {
    username,
    films: films.size, watched: watched.length, ratings: ratings.length, likes: likes.length,
    diary: diary.length, reviews: reviews.length, watchlist: watchlist.length, lists: lists.length,
  };
}
