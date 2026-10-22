import { uid, viewedUser } from "./auth";
import { db, posterSql } from "./db";
import { normalize } from "./titles";

// Recherche dans tous les titres d'un film (original, français, anglais, traductions), sans tenir compte des accents.
export const titleMatchSql = "(f.search_text LIKE ? OR f.name LIKE ? OR f.title_fr LIKE ? OR f.original_title LIKE ?)";
export const titleMatchArgs = (q: string) => [`%${normalize(q)}%`, `%${q}%`, `%${q}%`, `%${q}%`];

// Toutes ces requêtes ne lisent que les données de l'utilisateur connecté (uid).
// Le catalogue de films (table films) est partagé ; les vus, notes, listes… sont à chacun.

export type Film = {
  id: number;
  name: string;
  year: number | null;
  title_fr: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  rating: number | null;
  liked: boolean;
  director: string | null;
  runtime: number | null;
  tmdb_id?: number | null;
  lb_uri?: string | null;
};

export type FilmDetail = Film & {
  lb_uri: string | null;
  tmdb_id: number | null;
  original_title: string | null;
  titles: string | null; // JSON des titres traduits
  overview: string | null;
  genres: string[];
  directors: string[];
  cast: { name: string; character: string }[];
  countries: string[];
  watched_date: string | null;
  in_watchlist: boolean;
};

const json = <T>(v: unknown, fallback: T): T => (typeof v === "string" ? JSON.parse(v) : fallback);

// Colonnes et jointures communes ; u est l'identifiant de l'utilisateur (entier issu de la session).
const filmColumns = (u: number) => `f.id, f.name, f.year, f.title_fr, ${posterSql(u)} AS poster_path, f.backdrop_path,
  r.rating, (l.film_id IS NOT NULL) AS liked, json_extract(f.directors, '$[0]') AS director, f.runtime, f.tmdb_id, f.lb_uri`;
const filmJoins = (u: number) =>
  `LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u} LEFT JOIN likes l ON l.film_id = f.id AND l.user_id = ${u}`;

function toFilm(row: Record<string, unknown>): Film {
  return {
    id: Number(row.id),
    name: String(row.name),
    year: row.year == null ? null : Number(row.year),
    title_fr: (row.title_fr as string) ?? null,
    poster_path: (row.poster_path as string) ?? null,
    backdrop_path: (row.backdrop_path as string) ?? null,
    rating: row.rating == null ? null : Number(row.rating),
    liked: Boolean(row.liked),
    director: (row.director as string) ?? (typeof row.directors === "string" ? JSON.parse(row.directors)[0] ?? null : null),
    runtime: row.runtime == null ? null : Number(row.runtime),
    tmdb_id: row.tmdb_id == null ? null : Number(row.tmdb_id),
    lb_uri: (row.lb_uri as string) ?? null,
  };
}

export type FilmFilters = { q?: string; sort?: string; genre?: string; rating?: string };

const SORTS: Record<string, string> = {
  recent: "w.date DESC",
  rating: "r.rating DESC NULLS LAST, w.date DESC",
  year: "f.year DESC",
  title: "f.name COLLATE NOCASE",
};

export async function watchedFilms({ q, sort = "recent", genre, rating }: FilmFilters = {}) {
  const u = await uid();
  const where = [`w.user_id = ${u}`];
  const args: (string | number)[] = [];
  if (q) {
    where.push(`(${titleMatchSql} OR f.directors LIKE ?)`);
    args.push(...titleMatchArgs(q), `%${q}%`);
  }
  if (genre) {
    where.push("f.genres LIKE ?");
    args.push(`%"${genre}"%`);
  }
  if (rating) {
    where.push("r.rating = ?");
    args.push(Number(rating));
  }
  const { rows } = await db().execute({
    sql: `SELECT ${filmColumns(u)} FROM watched w JOIN films f ON f.id = w.film_id ${filmJoins(u)}
          WHERE ${where.join(" AND ")}
          ORDER BY ${SORTS[sort] ?? SORTS.recent}`,
    args,
  });
  return rows.map(toFilm);
}

export async function allGenres() {
  const u = await uid();
  const { rows } = await db().execute(
    `SELECT DISTINCT j.value AS genre FROM watched w JOIN films f ON f.id = w.film_id, json_each(f.genres) j WHERE w.user_id = ${u} ORDER BY genre`,
  );
  return rows.map((r) => String(r.genre));
}

export async function watchlistFilms() {
  const u = await uid();
  const { rows } = await db().execute(
    `SELECT ${filmColumns(u)} FROM watchlist wl JOIN films f ON f.id = wl.film_id ${filmJoins(u)} WHERE wl.user_id = ${u} ORDER BY wl.date DESC`,
  );
  return rows.map(toFilm);
}

export type DiaryEntry = Film & { watched_date: string; rewatch: boolean };

export async function recentDiary(limit = 12, userId?: number): Promise<DiaryEntry[]> {
  const u = await viewedUser(userId);
  const { rows } = await db().execute({
    sql: `SELECT f.id, f.name, f.year, f.title_fr, ${posterSql(u)} AS poster_path, f.backdrop_path,
            d.rating, (l.film_id IS NOT NULL) AS liked, d.watched_date, d.rewatch
          FROM diary d JOIN films f ON f.id = d.film_id LEFT JOIN likes l ON l.film_id = f.id AND l.user_id = ${u}
          WHERE d.user_id = ${u}
          ORDER BY d.watched_date DESC, d.id DESC LIMIT ?`,
    args: [limit],
  });
  return rows.map((r) => ({ ...toFilm(r), watched_date: String(r.watched_date), rewatch: Boolean(r.rewatch) }));
}

export async function favoriteFilms(limit = 12, userId?: number) {
  const u = await viewedUser(userId);
  const { rows } = await db().execute({
    sql: `SELECT ${filmColumns(u)} FROM likes l JOIN films f ON f.id = l.film_id LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u}
          WHERE l.user_id = ${u}
          ORDER BY r.rating DESC NULLS LAST, l.date DESC LIMIT ?`,
    args: [limit],
  });
  return rows.map(toFilm);
}

export async function overview() {
  const u = await uid();
  const { rows } = await db().execute(`SELECT
      (SELECT COUNT(*) FROM watched WHERE user_id = ${u}) AS watched,
      (SELECT COUNT(*) FROM reviews WHERE user_id = ${u}) AS reviews,
      (SELECT COUNT(*) FROM watchlist WHERE user_id = ${u}) AS watchlist,
      (SELECT ROUND(AVG(rating), 2) FROM ratings WHERE user_id = ${u}) AS avg_rating,
      (SELECT COALESCE(SUM(f.runtime), 0) FROM watched w JOIN films f ON f.id = w.film_id WHERE w.user_id = ${u}) AS minutes,
      (SELECT COUNT(*) FROM diary WHERE user_id = ${u} AND watched_date >= strftime('%Y-01-01', 'now')) AS this_year`);
  const r = rows[0];
  return {
    watched: Number(r.watched),
    reviews: Number(r.reviews),
    watchlist: Number(r.watchlist),
    avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
    hours: Math.round(Number(r.minutes) / 60),
    thisYear: Number(r.this_year),
  };
}

export async function filmDetail(id: number): Promise<FilmDetail | null> {
  const u = await uid();
  const { rows } = await db().execute({
    sql: `SELECT f.*, ${posterSql(u)} AS user_poster, r.rating, (l.film_id IS NOT NULL) AS liked, w.date AS watched_date,
            (wl.film_id IS NOT NULL) AS in_watchlist
          FROM films f ${filmJoins(u)}
          LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u}
          LEFT JOIN watchlist wl ON wl.film_id = f.id AND wl.user_id = ${u}
          WHERE f.id = ?`,
    args: [id],
  });
  const r = rows[0];
  if (!r) return null;
  return {
    ...toFilm({ ...r, poster_path: r.user_poster }),
    lb_uri: (r.lb_uri as string) ?? null,
    tmdb_id: r.tmdb_id == null ? null : Number(r.tmdb_id),
    original_title: (r.original_title as string) ?? null,
    titles: (r.titles as string) ?? null,
    overview: (r.overview as string) ?? null,
    runtime: r.runtime == null ? null : Number(r.runtime),
    genres: json(r.genres, []),
    directors: [...new Set(json<string[]>(r.directors, []))],
    cast: json(r.cast_list, []),
    countries: json(r.countries, []),
    watched_date: (r.watched_date as string) ?? null,
    in_watchlist: Boolean(r.in_watchlist),
  };
}

export async function filmReviews(id: number) {
  const u = await uid();
  const { rows } = await db().execute({
    sql: "SELECT date, watched_date, rating, rewatch, review, source FROM reviews WHERE film_id = ? AND user_id = ? ORDER BY watched_date DESC",
    args: [id, u],
  });
  return rows.map((r) => ({
    date: String(r.date),
    watchedDate: String(r.watched_date),
    rating: r.rating == null ? null : Number(r.rating),
    rewatch: Boolean(r.rewatch),
    review: String(r.review ?? ""),
    source: String(r.source),
  }));
}

export async function filmDiary(id: number) {
  const u = await uid();
  const { rows } = await db().execute({
    sql: "SELECT watched_date, rating, rewatch FROM diary WHERE film_id = ? AND user_id = ? ORDER BY watched_date DESC",
    args: [id, u],
  });
  return rows.map((r) => ({
    watchedDate: String(r.watched_date),
    rating: r.rating == null ? null : Number(r.rating),
    rewatch: Boolean(r.rewatch),
  }));
}

export async function filmLists(id: number) {
  const u = await uid();
  const { rows } = await db().execute({
    sql: `SELECT l.slug, l.name FROM list_items li JOIN lists l ON l.slug = li.list_slug AND l.user_id = li.user_id
          WHERE li.film_id = ? AND li.user_id = ?`,
    args: [id, u],
  });
  return rows.map((r) => ({ slug: String(r.slug), name: String(r.name) }));
}

export async function allLists() {
  const u = await uid();
  const { rows } = await db().execute(
    `SELECT l.slug, l.name, l.description, COUNT(li.film_id) AS count,
       (SELECT json_group_array(poster_path) FROM (
          SELECT ${posterSql(u)} AS poster_path FROM list_items x JOIN films f ON f.id = x.film_id
          WHERE x.user_id = ${u} AND x.list_slug = l.slug AND f.poster_path IS NOT NULL ORDER BY x.position LIMIT 4)) AS posters
     FROM lists l LEFT JOIN list_items li ON li.list_slug = l.slug AND li.user_id = l.user_id
     WHERE l.user_id = ${u}
     GROUP BY l.slug ORDER BY l.name COLLATE NOCASE`,
  );
  return rows.map((r) => ({
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description ?? ""),
    count: Number(r.count),
    posters: json<string[]>(r.posters, []),
  }));
}

export async function listDetail(slug: string) {
  const u = await uid();
  const meta = await db().execute({ sql: "SELECT name, description FROM lists WHERE slug = ? AND user_id = ?", args: [slug, u] });
  if (!meta.rows[0]) return null;
  const { rows } = await db().execute({
    sql: `SELECT ${filmColumns(u)}, (w.film_id IS NOT NULL) AS seen
          FROM list_items li JOIN films f ON f.id = li.film_id ${filmJoins(u)}
          LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u}
          WHERE li.list_slug = ? AND li.user_id = ${u} ORDER BY li.position`,
    args: [slug],
  });
  return {
    name: String(meta.rows[0].name),
    description: String(meta.rows[0].description ?? ""),
    films: rows.map((r) => ({ ...toFilm(r), seen: Boolean(r.seen) })),
  };
}

// Recherche rapide dans le catalogue (mes films de watchlist en premier) pour l'agenda.
export async function searchMyFilms(q: string) {
  if (!q.trim()) return [];
  const u = await uid();
  const { rows } = await db().execute({
    sql: `SELECT f.id, COALESCE(f.title_fr, f.name) AS title, f.year, ${posterSql(u)} AS poster_path,
            (wl.film_id IS NOT NULL) AS in_watchlist
          FROM films f LEFT JOIN watchlist wl ON wl.film_id = f.id AND wl.user_id = ${u}
          WHERE ${titleMatchSql}
          ORDER BY in_watchlist DESC, f.year DESC LIMIT 8`,
    args: titleMatchArgs(q),
  });
  return rows.map((r) => ({ id: Number(r.id), title: String(r.title), year: r.year == null ? null : Number(r.year), poster: (r.poster_path as string) ?? null }));
}
