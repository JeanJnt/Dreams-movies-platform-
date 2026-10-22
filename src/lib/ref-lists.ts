import { parse } from "csv-parse/sync";
import { uid } from "./auth";
import { db, ensureSchema, posterSql } from "./db";
import { tmdb } from "./tmdb";

/*
 * Listes de référence (communes à tous les membres) : Sight and Sound, Top Letterboxd, Top TMDB…
 * Ajoutées par un administrateur depuis :
 *   - une liste publique TMDB (adresse themoviedb.org/list/…), via l'API officielle de TMDB
 *   - le Top des films les mieux notés de TMDB
 *   - l'export CSV d'une liste Letterboxd
 * Chaque membre y voit sa progression (films vus).
 */

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "liste";

type TmdbItem = { id: number; title?: string; release_date?: string; poster_path: string | null; media_type?: string };

// Ajoute les films au catalogue partagé (infos minimales), en quelques requêtes groupées ;
// leurs fiches complètes sont complétées ensuite (enrichissement).
async function filmsFromTmdb(items: TmdbItem[]) {
  const movies = items.filter((it) => !it.media_type || it.media_type === "movie");
  if (!movies.length) return [];
  const known = await db().execute(`SELECT id, tmdb_id FROM films WHERE tmdb_id IN (${movies.map((m) => Number(m.id)).join(",")})`);
  const byTmdb = new Map(known.rows.map((r) => [Number(r.tmdb_id), Number(r.id)]));
  const keyOf = (it: TmdbItem) => `${it.title}|${it.release_date ? it.release_date.slice(0, 4) : ""}`;
  const missing = movies.filter((m) => !byTmdb.has(m.id));
  for (let i = 0; i < missing.length; i += 200) {
    await db().batch(
      missing.slice(i, i + 200).map((it) => ({
        sql: `INSERT INTO films (key, name, year, tmdb_id, poster_path, tmdb_status) VALUES (?, ?, ?, ?, ?, 'partial')
              ON CONFLICT(key) DO UPDATE SET tmdb_id = COALESCE(films.tmdb_id, excluded.tmdb_id)`,
        args: [keyOf(it), it.title ?? "?", it.release_date ? Number(it.release_date.slice(0, 4)) : null, it.id, it.poster_path],
      })),
      "write",
    );
  }
  if (missing.length) {
    const keys = missing.map(keyOf);
    for (let i = 0; i < keys.length; i += 300) {
      const part = keys.slice(i, i + 300);
      const { rows } = await db().execute({ sql: `SELECT id, tmdb_id FROM films WHERE key IN (${part.map(() => "?").join(",")})`, args: part });
      rows.forEach((r) => byTmdb.set(Number(r.tmdb_id), Number(r.id)));
    }
  }
  return movies.map((m) => byTmdb.get(m.id)).filter((id): id is number => id != null);
}

async function saveList(meta: { name: string; description?: string | null; source: string; sourceUrl?: string | null }, filmIds: number[]) {
  await ensureSchema();
  const me = await uid();
  let slug = slugify(meta.name);
  const taken = await db().execute({ sql: "SELECT 1 FROM ref_lists WHERE slug = ?", args: [slug] });
  if (taken.rows[0]) slug = `${slug}-${Date.now().toString(36)}`;
  const res = await db().execute({
    sql: "INSERT INTO ref_lists (slug, name, description, source, source_url, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    args: [slug, meta.name.slice(0, 120), meta.description?.slice(0, 1000) ?? null, meta.source, meta.sourceUrl ?? null, me],
  });
  const listId = Number(res.lastInsertRowid);
  const unique = [...new Set(filmIds)];
  for (let i = 0; i < unique.length; i += 300) {
    await db().batch(
      unique.slice(i, i + 300).map((filmId, j) => ({ sql: "INSERT OR IGNORE INTO ref_list_items (list_id, film_id, rank) VALUES (?, ?, ?)", args: [listId, filmId, i + j + 1] })),
      "write",
    );
  }
  return { slug, count: unique.length };
}

// Une liste publique TMDB : on accepte l'adresse complète ou juste son numéro.
export async function importTmdbList(input: string, nameOverride?: string) {
  const id = input.match(/list\/(\d+)/)?.[1] ?? input.match(/^\d+$/)?.[0];
  if (!id) throw new Error("Colle l'adresse d'une liste TMDB, par exemple https://www.themoviedb.org/list/12345");
  type Page = { name: string; description: string; items: TmdbItem[]; total_pages?: number; page?: number };
  const first = await tmdb<Page>(`/list/${id}`, { language: "en-US", page: "1" });
  const items = [...first.items];
  for (let p = 2; p <= Math.min(first.total_pages ?? 1, 50); p++) {
    items.push(...(await tmdb<Page>(`/list/${id}`, { language: "en-US", page: String(p) })).items);
  }
  if (!items.length) throw new Error("Cette liste TMDB est vide ou privée.");
  const ids = await filmsFromTmdb(items);
  return saveList({ name: nameOverride?.trim() || first.name, description: first.description, source: "tmdb-list", sourceUrl: `https://www.themoviedb.org/list/${id}` }, ids);
}

// Les films les mieux notés de TMDB (250 par défaut). On exige un grand nombre de votes,
// sinon des nouveautés notées par une poignée de fans passent devant les classiques.
export async function importTmdbTop(count = 250) {
  const items: TmdbItem[] = [];
  for (let p = 1; items.length < count && p <= 25; p++) {
    const params = { language: "en-US", page: String(p), sort_by: "vote_average.desc", "vote_count.gte": "3000", include_adult: "false" };
    items.push(...(await tmdb<{ results: TmdbItem[] }>("/discover/movie", params)).results);
  }
  const ids = await filmsFromTmdb(items.slice(0, count));
  return saveList({ name: `Top ${count} TMDB`, description: "Les films les mieux notés par les membres de TMDB.", source: "tmdb-top", sourceUrl: "https://www.themoviedb.org/movie/top-rated" }, ids);
}

// Export CSV d'une liste Letterboxd (format « Letterboxd list export »).
export async function importLetterboxdCsv(text: string, nameOverride?: string) {
  if (text.length > 2_000_000) throw new Error("Fichier trop lourd.");
  const parts = text.split(/\r?\n\r?\n/);
  const meta = parts.length > 1 ? (parse(parts[0].split(/\r?\n/).slice(1).join("\n"), { columns: true, bom: true, relax_column_count: true })[0] as Record<string, string> | undefined) : undefined;
  const rows = parse(parts.length > 1 ? parts[1] : parts[0], { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true }) as Record<string, string>[];
  if (!rows.length || !rows[0].Name) throw new Error("Ce n'est pas un export de liste Letterboxd (colonnes Name, Year…).");
  const ids: number[] = [];
  for (const r of rows) {
    const key = `${r.Name.slice(0, 300)}|${r.Year ?? ""}`;
    await db().execute({
      sql: "INSERT INTO films (key, name, year, lb_uri) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET lb_uri = COALESCE(films.lb_uri, excluded.lb_uri)",
      args: [key, r.Name.slice(0, 300), r.Year ? Number(r.Year) : null, /^https:\/\/(boxd\.it|letterboxd\.com)\//.test(r.URL ?? "") ? r.URL : null],
    });
    const { rows: f } = await db().execute({ sql: "SELECT id FROM films WHERE key = ?", args: [key] });
    ids.push(Number(f[0].id));
  }
  return saveList({ name: nameOverride?.trim() || meta?.Name || "Liste Letterboxd", description: meta?.Description, source: "letterboxd-csv", sourceUrl: meta?.URL }, ids);
}

export async function deleteRefList(slug: string) {
  const { rows } = await db().execute({ sql: "SELECT id FROM ref_lists WHERE slug = ?", args: [slug] });
  if (!rows[0]) return;
  await db().batch(
    [{ sql: "DELETE FROM ref_list_items WHERE list_id = ?", args: [Number(rows[0].id)] }, { sql: "DELETE FROM ref_lists WHERE id = ?", args: [Number(rows[0].id)] }],
    "write",
  );
}

// --- Lecture, avec la progression du membre connecté ---

export async function refLists() {
  await ensureSchema();
  const u = await uid();
  const { rows } = await db().execute(`
    SELECT l.slug, l.name, l.description, l.source, COUNT(i.film_id) AS total,
      SUM(CASE WHEN w.film_id IS NOT NULL THEN 1 ELSE 0 END) AS seen,
      (SELECT json_group_array(p) FROM (SELECT ${posterSql(u)} AS p FROM ref_list_items x JOIN films f ON f.id = x.film_id
         WHERE x.list_id = l.id AND f.poster_path IS NOT NULL ORDER BY x.rank LIMIT 4)) AS posters
    FROM ref_lists l LEFT JOIN ref_list_items i ON i.list_id = l.id
    LEFT JOIN watched w ON w.film_id = i.film_id AND w.user_id = ${u}
    GROUP BY l.id ORDER BY l.created_at`);
  return rows.map((r) => ({
    slug: String(r.slug), name: String(r.name), description: (r.description as string) ?? null, source: String(r.source),
    total: Number(r.total), seen: Number(r.seen ?? 0), posters: typeof r.posters === "string" ? (JSON.parse(r.posters) as string[]) : [],
  }));
}

export async function refListDetail(slug: string) {
  await ensureSchema();
  const u = await uid();
  const meta = await db().execute({ sql: "SELECT id, name, description, source_url FROM ref_lists WHERE slug = ?", args: [slug] });
  if (!meta.rows[0]) return null;
  const { rows } = await db().execute({
    sql: `SELECT f.id, f.name, f.year, f.title_fr, ${posterSql(u)} AS poster_path, f.backdrop_path, f.tmdb_id, f.lb_uri, f.runtime,
            json_extract(f.directors, '$[0]') AS director, r.rating, (l.film_id IS NOT NULL) AS liked, (w.film_id IS NOT NULL) AS seen, i.rank
          FROM ref_list_items i JOIN films f ON f.id = i.film_id
          LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u} LEFT JOIN likes l ON l.film_id = f.id AND l.user_id = ${u}
          LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u}
          WHERE i.list_id = ? ORDER BY i.rank`,
    args: [Number(meta.rows[0].id)],
  });
  return {
    name: String(meta.rows[0].name),
    description: (meta.rows[0].description as string) ?? null,
    sourceUrl: (meta.rows[0].source_url as string) ?? null,
    films: rows.map((r) => ({
      id: Number(r.id), name: String(r.name), year: r.year == null ? null : Number(r.year), title_fr: (r.title_fr as string) ?? null,
      poster_path: (r.poster_path as string) ?? null, backdrop_path: (r.backdrop_path as string) ?? null,
      tmdb_id: r.tmdb_id == null ? null : Number(r.tmdb_id), lb_uri: (r.lb_uri as string) ?? null,
      runtime: r.runtime == null ? null : Number(r.runtime), director: (r.director as string) ?? null,
      rating: r.rating == null ? null : Number(r.rating), liked: Boolean(r.liked), seen: Boolean(r.seen), rank: Number(r.rank),
    })),
  };
}
