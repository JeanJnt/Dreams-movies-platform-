import { currentUser, uid } from "./auth";
import { db, ensureSchema, posterSql } from "./db";
import { chosenFilter, watchedForAlertsSql } from "./alert-sources";
import { pciCheck } from "./pariscine";
import { tmdb } from "./tmdb";

// Alertes « au cinéma » : un film de ma watchlist ou de mes coups de cœur est (ou va être) en salle en France.

type Mine = { tmdbId: number; filmId: number; source: "watchlist" | "coup_de_coeur" | "prefere"; year: number | null };

// Les films que je surveille (selon mes réglages : watchlist, coups de cœur, films préférés).
async function myFilms(u: number): Promise<Mine[]> {
  const sql = await watchedForAlertsSql(u, "f.tmdb_id, f.id, f.year");
  if (!sql) return [];
  const { rows } = await db().execute(sql);
  const map = new Map<number, Mine>();
  for (const r of rows) {
    const id = Number(r.tmdb_id);
    if (!map.has(id)) map.set(id, { tmdbId: id, filmId: Number(r.id), source: r.source as Mine["source"], year: r.year == null ? null : Number(r.year) });
  }
  return [...map.values()];
}

async function upsert(u: number, m: Mine, kind: string, releaseDate: string | null, note: string | null) {
  await db().execute({
    sql: `INSERT INTO alerts (user_id, tmdb_id, film_id, kind, release_date, note, source) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, tmdb_id) DO UPDATE SET kind = excluded.kind, release_date = excluded.release_date,
            note = COALESCE(excluded.note, alerts.note),
            seen = CASE WHEN alerts.kind = excluded.kind THEN alerts.seen ELSE 0 END
          WHERE alerts.kind != 'paris'`,
    args: [u, m.tmdbId, m.filmId, kind, releaseDate, note, m.source],
  });
}

// Vérification rapide (une dizaine d'appels) : les listes « à l'affiche » et « prochainement » de TMDB pour la France.
// userId : fourni par la tâche automatique quotidienne ; sinon, le membre connecté.
export async function quickCheck(userId?: number) {
  await ensureSchema();
  const u = userId ?? (await uid());
  const mine = new Map((await myFilms(u)).map((m) => [m.tmdbId, m]));
  const region = await userCountry(u);
  let found = 0;
  for (const [list, kind, pages] of [["now_playing", "en_salle", 6], ["upcoming", "bientot", 4]] as const) {
    for (let page = 1; page <= pages; page++) {
      const res = await tmdb<{ results: { id: number; release_date?: string }[]; total_pages: number }>(`/movie/${list}`, { region, page: String(page) });
      for (const r of res.results) {
        const m = mine.get(r.id);
        if (m) {
          await upsert(u, m, kind, r.release_date ?? null, null);
          found++;
        }
      }
      if (page >= res.total_pages) break;
    }
  }
  // À Paris : le programme de toutes les salles (classiques et rétrospectives comprises) via Paris Ciné Info.
  const { rows } = await db().execute({ sql: "SELECT city FROM users WHERE id = ?", args: [u] });
  if (/^paris$/i.test(String(rows[0]?.city ?? "Paris").trim())) found += await pciCheck(u).catch(() => 0);
  await cleanup(u);
  await db().execute({ sql: "UPDATE users SET alerts_checked_at = ? WHERE id = ?", args: [new Date().toISOString(), u] });
  return found;
}

// Vérification complète (un appel par film) : détecte aussi les ressorties en salle (versions restaurées…).
export async function fullCheck(onProgress?: (done: number, total: number) => void, userId?: number) {
  await ensureSchema();
  const u = userId ?? (await uid());
  const mine = await myFilms(u);
  const region = await userCountry(u);
  const today = Date.now();
  const DAY = 86_400_000;
  let done = 0, found = 0;
  const queue = [...mine];
  const worker = async () => {
    for (let m = queue.shift(); m; m = queue.shift()) {
      try {
        const res = await tmdb<{ results: { iso_3166_1: string; release_dates: { release_date: string; type: number; note: string }[] }[] }>(`/movie/${m.tmdbId}/release_dates`);
        const fr = res.results.find((r) => r.iso_3166_1 === region);
        // Type 3 = sortie en salle. On garde celles entre il y a 5 semaines et dans 2 mois.
        const theatrical = (fr?.release_dates ?? [])
          .filter((d) => d.type === 3 || d.type === 2)
          .map((d) => ({ ...d, t: new Date(d.release_date).getTime() }))
          .filter((d) => d.t > today - 35 * DAY && d.t < today + 60 * DAY)
          .sort((a, b) => a.t - b.t)[0];
        if (theatrical) {
          const isOld = m.year != null && m.year < new Date().getFullYear() - 1;
          const kind = isOld ? "ressortie" : theatrical.t <= today ? "en_salle" : "bientot";
          await upsert(u, m, kind, theatrical.release_date.slice(0, 10), theatrical.note || null);
          found++;
        }
      } catch {
        // film introuvable ou quota : on passe
      }
      onProgress?.(++done, mine.length);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  await cleanup(u);
  return found;
}

async function userCountry(u: number) {
  const { rows } = await db().execute({ sql: "SELECT country FROM users WHERE id = ?", args: [u] });
  return String(rows[0]?.country ?? "FR");
}

// Tous les films à l'affiche en ce moment dans le pays du membre (pas seulement les siens), les plus populaires d'abord.
export type NowPlaying = { tmdbId: number; filmId: number | null; title: string; original: string; year: number | null; poster: string | null; seen: boolean; wanted: boolean };
export async function nowPlaying(): Promise<NowPlaying[]> {
  await ensureSchema();
  const u = await uid();
  const region = await userCountry(u);
  type R = { id: number; title: string; original_title: string; release_date?: string; poster_path: string | null; popularity: number };
  const pages = await Promise.all(
    [1, 2, 3].map((p) =>
      tmdb<{ results: R[] }>("/movie/now_playing", { region, page: String(p) }, 3, { next: { revalidate: 6 * 3600 } }).then((r) => r.results).catch(() => [] as R[]),
    ),
  );
  const seenIds = new Set<number>();
  const films = pages.flat().filter((f) => !seenIds.has(f.id) && seenIds.add(f.id)).sort((a, b) => b.popularity - a.popularity);
  if (!films.length) return [];
  const { rows } = await db().execute(`
    SELECT f.id, f.tmdb_id, (w.film_id IS NOT NULL) AS seen, (wl.film_id IS NOT NULL) AS wanted FROM films f
    LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u} LEFT JOIN watchlist wl ON wl.film_id = f.id AND wl.user_id = ${u}
    WHERE f.tmdb_id IN (${films.map((f) => Number(f.id)).join(",")})`);
  const local = new Map(rows.map((r) => [Number(r.tmdb_id), r]));
  return films.map((f) => {
    const l = local.get(f.id);
    return {
      tmdbId: f.id, filmId: l ? Number(l.id) : null, title: f.title, original: f.original_title, year: f.release_date ? Number(f.release_date.slice(0, 4)) : null,
      poster: f.poster_path, seen: Boolean(l?.seen), wanted: Boolean(l?.wanted),
    };
  });
}

// On oublie les alertes trop anciennes (sorties depuis plus de 2 mois), et celles des films que je ne surveille plus.
async function cleanup(u: number) {
  await db().execute(`DELETE FROM alerts WHERE user_id = ${u} AND release_date IS NOT NULL AND release_date < date('now', '-60 days')`);
  const sql = await watchedForAlertsSql(u, "f.tmdb_id");
  await db().execute(`DELETE FROM alerts WHERE user_id = ${u}${sql ? ` AND tmdb_id NOT IN (SELECT tmdb_id FROM (${sql}))` : ""}`);
}

export type Alert = {
  tmdbId: number;
  filmId: number;
  kind: "paris" | "en_salle" | "bientot" | "ressortie";
  releaseDate: string | null;
  note: string | null;
  source: "watchlist" | "coup_de_coeur" | "prefere";
  seen: boolean;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  director: string | null;
};

export async function listAlerts(): Promise<Alert[]> {
  await ensureSchema();
  const u = await uid();
  const { rows } = await db().execute(`
    SELECT a.*, COALESCE(f.title_fr, f.name) AS title, f.year, ${posterSql(u)} AS poster,
      f.backdrop_path, json_extract(f.directors, '$[0]') AS director
    FROM alerts a JOIN films f ON f.id = a.film_id WHERE a.user_id = ${u} AND ${await chosenFilter(u)}
    ORDER BY a.seen, CASE a.kind WHEN 'paris' THEN 0 WHEN 'en_salle' THEN 1 WHEN 'ressortie' THEN 2 ELSE 3 END, a.release_date`);
  return rows.map((r) => ({
    tmdbId: Number(r.tmdb_id), filmId: Number(r.film_id), kind: r.kind as Alert["kind"], releaseDate: (r.release_date as string) ?? null,
    note: (r.note as string) ?? null, source: r.source as Alert["source"], seen: Boolean(r.seen), title: String(r.title),
    year: r.year == null ? null : Number(r.year), poster: (r.poster as string) ?? null, backdrop: (r.backdrop_path as string) ?? null,
    director: (r.director as string) ?? null,
  }));
}

export async function unseenAlerts() {
  try {
    const me = await currentUser();
    if (!me) return 0;
    const { rows } = await db().execute({ sql: `SELECT COUNT(*) AS n FROM alerts a WHERE a.seen = 0 AND a.user_id = ? AND ${await chosenFilter(me.id)}`, args: [me.id] });
    return Number(rows[0].n);
  } catch {
    return 0;
  }
}

export async function markAlertsSeen() {
  await db().execute({ sql: "UPDATE alerts SET seen = 1 WHERE seen = 0 AND user_id = ?", args: [await uid()] });
}
