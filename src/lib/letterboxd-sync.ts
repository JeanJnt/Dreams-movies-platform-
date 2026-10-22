import { db, ensureSchema } from "./db";
import { applyMovieToFilm, fetchMovie } from "./tmdb-film";

/*
 * Synchronisation avec le flux RSS public d'un membre Letterboxd (letterboxd.com/<pseudo>/rss/).
 * Le flux contient ses 50 dernières entrées de journal : film (avec son identifiant TMDB), date de visionnage,
 * note, ❤️, « revu », et le texte de la review s'il y en a une.
 * Il ne contient PAS la watchlist, les films vus sans date ni les listes : pour ça, on réimporte l'export .zip.
 */

export const isValidUsername = (u: string) => /^[A-Za-z0-9_]{2,30}$/.test(u);
const feedUrl = (u: string) => `https://letterboxd.com/${encodeURIComponent(u)}/rss/`;

type Entry = {
  guid: string;
  tmdbId: number | null;
  title: string;
  year: number | null;
  watchedDate: string;
  rewatch: boolean;
  rating: number | null;
  liked: boolean;
  review: string | null;
};

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? null;

const decode = (s: string) =>
  s
    .replace(/&#0*39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

// Le texte de la review se trouve dans la description, entre l'affiche et la mention « Watched on… ».
export function reviewText(description: string | null): string | null {
  if (!description) return null;
  const html = description.replace(/^<!\[CDATA\[|\]\]>$/g, "");
  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => m[1])
    .filter((p) => !/^<img/.test(p.trim()) && !/^Watched on /.test(p.trim()) && !/^<em>This review may contain spoilers/.test(p.trim()));
  const text = paragraphs.map((p) => decode(p.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).trim()).filter(Boolean).join("\n\n");
  return text || null;
}

export async function fetchFeed(username: string): Promise<Entry[] | null> {
  const res = await fetch(feedUrl(username), { headers: { "User-Agent": "Dreams (journal de cinema prive)" }, cache: "no-store" });
  if (!res.ok) return null;
  const xml = await res.text();
  if (!xml.includes("<channel>")) return null;
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => m[1])
    .filter((item) => tag(item, "letterboxd:watchedDate")) // seulement les entrées de journal (pas les listes)
    .map((item) => ({
      guid: tag(item, "guid") ?? "",
      tmdbId: tag(item, "tmdb:movieId") ? Number(tag(item, "tmdb:movieId")) : null,
      title: decode(tag(item, "letterboxd:filmTitle") ?? ""),
      year: tag(item, "letterboxd:filmYear") ? Number(tag(item, "letterboxd:filmYear")) : null,
      watchedDate: tag(item, "letterboxd:watchedDate")!,
      rewatch: tag(item, "letterboxd:rewatch") === "Yes",
      rating: tag(item, "letterboxd:memberRating") ? Number(tag(item, "letterboxd:memberRating")) : null,
      liked: tag(item, "letterboxd:memberLike") === "Yes",
      // Les reviews ont un identifiant « letterboxd-review-… » ; les simples visionnages « letterboxd-watch-… ».
      review: tag(item, "guid")?.startsWith("letterboxd-review") ? reviewText(tag(item, "description")) : null,
    }));
}

// Retrouve le film dans le catalogue (par TMDB, puis par titre et année comme à l'import), ou le crée.
async function filmFor(e: Entry): Promise<number | null> {
  if (e.tmdbId) {
    const { rows } = await db().execute({ sql: "SELECT id FROM films WHERE tmdb_id = ?", args: [e.tmdbId] });
    if (rows[0]) return Number(rows[0].id);
  }
  const key = `${e.title}|${e.year ?? ""}`;
  const byKey = await db().execute({ sql: "SELECT id, tmdb_status FROM films WHERE key = ?", args: [key] });
  let id = byKey.rows[0] ? Number(byKey.rows[0].id) : null;
  if (!id) {
    const res = await db().execute({ sql: "INSERT INTO films (key, name, year) VALUES (?, ?, ?)", args: [key, e.title, e.year] });
    id = Number(res.lastInsertRowid);
  }
  if (e.tmdbId && (!byKey.rows[0] || byKey.rows[0].tmdb_status !== "ok")) {
    await applyMovieToFilm(id, await fetchMovie(e.tmdbId)).catch(() => {});
  }
  return id;
}

export type SyncResult = { ok: boolean; error?: string; newFilms: number; newReviews: number; entries: number };

export async function syncLetterboxd(userId: number): Promise<SyncResult> {
  await ensureSchema();
  const u = Number(userId);
  const { rows } = await db().execute({ sql: "SELECT letterboxd_username FROM users WHERE id = ?", args: [u] });
  const username = rows[0]?.letterboxd_username as string | null;
  if (!username) return { ok: false, error: "Aucun compte Letterboxd connecté.", newFilms: 0, newReviews: 0, entries: 0 };

  const entries = await fetchFeed(username).catch(() => null);
  if (!entries) return { ok: false, error: "Flux Letterboxd introuvable (pseudo incorrect, ou profil privé ?).", newFilms: 0, newReviews: 0, entries: 0 };

  let newFilms = 0, newReviews = 0;
  // Du plus ancien au plus récent, pour que la dernière note l'emporte.
  for (const e of [...entries].reverse()) {
    const filmId = await filmFor(e);
    if (!filmId) continue;
    const seen = await db().execute({ sql: "SELECT 1 FROM diary WHERE user_id = ? AND film_id = ? AND watched_date = ?", args: [u, filmId, e.watchedDate] });
    const statements: { sql: string; args: (string | number | null)[] }[] = [
      { sql: "INSERT OR IGNORE INTO watched (user_id, film_id, date) VALUES (?, ?, ?)", args: [u, filmId, e.watchedDate] },
      // Vu → il sort de la watchlist, comme sur Letterboxd
      { sql: "DELETE FROM watchlist WHERE user_id = ? AND film_id = ?", args: [u, filmId] },
      e.liked
        ? { sql: "INSERT OR IGNORE INTO likes (user_id, film_id, date) VALUES (?, ?, ?)", args: [u, filmId, e.watchedDate] }
        : { sql: "DELETE FROM likes WHERE user_id = ? AND film_id = ?", args: [u, filmId] },
    ];
    if (e.rating != null) {
      statements.push({
        sql: "INSERT INTO ratings (user_id, film_id, rating, date) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, film_id) DO UPDATE SET rating = excluded.rating, date = excluded.date",
        args: [u, filmId, e.rating, e.watchedDate],
      });
    }
    if (!seen.rows[0]) {
      statements.push({
        sql: "INSERT INTO diary (user_id, film_id, logged_date, watched_date, rating, rewatch) VALUES (?, ?, ?, ?, ?, ?)",
        args: [u, filmId, e.watchedDate, e.watchedDate, e.rating, e.rewatch ? 1 : 0],
      });
      newFilms++;
    }
    if (e.review) {
      const existing = await db().execute({
        sql: "SELECT id FROM reviews WHERE user_id = ? AND film_id = ? AND watched_date = ? AND source = 'letterboxd'",
        args: [u, filmId, e.watchedDate],
      });
      if (existing.rows[0]) {
        statements.push({ sql: "UPDATE reviews SET review = ?, rating = ? WHERE id = ?", args: [e.review.slice(0, 50_000), e.rating, Number(existing.rows[0].id)] });
      } else {
        statements.push({
          sql: "INSERT INTO reviews (user_id, film_id, date, watched_date, rating, rewatch, review, source) VALUES (?, ?, ?, ?, ?, ?, ?, 'letterboxd')",
          args: [u, filmId, e.watchedDate, e.watchedDate, e.rating, e.rewatch ? 1 : 0, e.review.slice(0, 50_000)],
        });
        newReviews++;
      }
    }
    await db().batch(statements, "write");
  }
  await db().execute({ sql: "UPDATE users SET letterboxd_synced_at = datetime('now') WHERE id = ?", args: [u] });
  return { ok: true, newFilms, newReviews, entries: entries.length };
}

export async function connectLetterboxd(userId: number, username: string): Promise<SyncResult> {
  const clean = username.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?letterboxd\.com\//, "").replace(/\/.*$/, "");
  if (!isValidUsername(clean)) return { ok: false, error: "Pseudo Letterboxd invalide.", newFilms: 0, newReviews: 0, entries: 0 };
  const feed = await fetchFeed(clean).catch(() => null);
  if (!feed) return { ok: false, error: `Impossible de lire le flux de « ${clean} » : vérifie le pseudo.`, newFilms: 0, newReviews: 0, entries: 0 };
  await db().execute({ sql: "UPDATE users SET letterboxd_username = ? WHERE id = ?", args: [clean, Number(userId)] });
  return syncLetterboxd(userId);
}

export async function disconnectLetterboxd(userId: number) {
  await db().execute({ sql: "UPDATE users SET letterboxd_username = NULL, letterboxd_synced_at = NULL WHERE id = ?", args: [Number(userId)] });
}
