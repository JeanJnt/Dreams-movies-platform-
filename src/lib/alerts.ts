import { db, ensureSchema } from "./db";
import { tmdb } from "./tmdb";

// Alertes « au cinéma » : un film de ma watchlist ou de mes coups de cœur est (ou va être) en salle en France.

type Mine = { tmdbId: number; filmId: number; source: "watchlist" | "coup_de_coeur"; year: number | null };

async function myFilms(): Promise<Mine[]> {
  const { rows } = await db().execute(`
    SELECT f.tmdb_id, f.id, f.year, 'watchlist' AS source FROM watchlist w JOIN films f ON f.id = w.film_id WHERE f.tmdb_id IS NOT NULL
    UNION
    SELECT f.tmdb_id, f.id, f.year, 'coup_de_coeur' AS source FROM likes l JOIN films f ON f.id = l.film_id WHERE f.tmdb_id IS NOT NULL`);
  const map = new Map<number, Mine>();
  for (const r of rows) {
    const id = Number(r.tmdb_id);
    if (!map.has(id)) map.set(id, { tmdbId: id, filmId: Number(r.id), source: r.source as Mine["source"], year: r.year == null ? null : Number(r.year) });
  }
  return [...map.values()];
}

async function upsert(m: Mine, kind: string, releaseDate: string | null, note: string | null) {
  await db().execute({
    sql: `INSERT INTO alerts (tmdb_id, film_id, kind, release_date, note, source) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(tmdb_id) DO UPDATE SET kind = excluded.kind, release_date = excluded.release_date,
            note = COALESCE(excluded.note, alerts.note),
            seen = CASE WHEN alerts.kind = excluded.kind THEN alerts.seen ELSE 0 END`,
    args: [m.tmdbId, m.filmId, kind, releaseDate, note, m.source],
  });
}

// Vérification rapide (une dizaine d'appels) : les listes « à l'affiche » et « prochainement » de TMDB pour la France.
export async function quickCheck() {
  await ensureSchema();
  const mine = new Map((await myFilms()).map((m) => [m.tmdbId, m]));
  let found = 0;
  for (const [list, kind, pages] of [["now_playing", "en_salle", 6], ["upcoming", "bientot", 4]] as const) {
    for (let page = 1; page <= pages; page++) {
      const res = await tmdb<{ results: { id: number; release_date?: string }[]; total_pages: number }>(`/movie/${list}`, { region: "FR", page: String(page) });
      for (const r of res.results) {
        const m = mine.get(r.id);
        if (m) {
          await upsert(m, kind, r.release_date ?? null, null);
          found++;
        }
      }
      if (page >= res.total_pages) break;
    }
  }
  await cleanup();
  return found;
}

// Vérification complète (un appel par film) : détecte aussi les ressorties en salle (versions restaurées…).
export async function fullCheck(onProgress?: (done: number, total: number) => void) {
  await ensureSchema();
  const mine = await myFilms();
  const today = Date.now();
  const DAY = 86_400_000;
  let done = 0, found = 0;
  const queue = [...mine];
  const worker = async () => {
    for (let m = queue.shift(); m; m = queue.shift()) {
      try {
        const res = await tmdb<{ results: { iso_3166_1: string; release_dates: { release_date: string; type: number; note: string }[] }[] }>(`/movie/${m.tmdbId}/release_dates`);
        const fr = res.results.find((r) => r.iso_3166_1 === "FR");
        // Type 3 = sortie en salle. On garde celles entre il y a 5 semaines et dans 2 mois.
        const theatrical = (fr?.release_dates ?? [])
          .filter((d) => d.type === 3 || d.type === 2)
          .map((d) => ({ ...d, t: new Date(d.release_date).getTime() }))
          .filter((d) => d.t > today - 35 * DAY && d.t < today + 60 * DAY)
          .sort((a, b) => a.t - b.t)[0];
        if (theatrical) {
          const isOld = m.year != null && m.year < new Date().getFullYear() - 1;
          const kind = isOld ? "ressortie" : theatrical.t <= today ? "en_salle" : "bientot";
          await upsert(m, kind, theatrical.release_date.slice(0, 10), theatrical.note || null);
          found++;
        }
      } catch {
        // film introuvable ou quota : on passe
      }
      onProgress?.(++done, mine.length);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  await cleanup();
  return found;
}

// On oublie les alertes trop anciennes (sorties depuis plus de 2 mois).
async function cleanup() {
  await db().execute("DELETE FROM alerts WHERE release_date IS NOT NULL AND release_date < date('now', '-60 days')");
}

export type Alert = {
  tmdbId: number;
  filmId: number;
  kind: "en_salle" | "bientot" | "ressortie";
  releaseDate: string | null;
  note: string | null;
  source: "watchlist" | "coup_de_coeur";
  seen: boolean;
  title: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  director: string | null;
};

export async function listAlerts(): Promise<Alert[]> {
  await ensureSchema();
  const { rows } = await db().execute(`
    SELECT a.*, COALESCE(f.title_fr, f.name) AS title, f.year, COALESCE(f.custom_poster, f.poster_path) AS poster,
      f.backdrop_path, json_extract(f.directors, '$[0]') AS director
    FROM alerts a JOIN films f ON f.id = a.film_id
    ORDER BY a.seen, CASE a.kind WHEN 'en_salle' THEN 0 WHEN 'ressortie' THEN 1 ELSE 2 END, a.release_date`);
  return rows.map((r) => ({
    tmdbId: Number(r.tmdb_id), filmId: Number(r.film_id), kind: r.kind as Alert["kind"], releaseDate: (r.release_date as string) ?? null,
    note: (r.note as string) ?? null, source: r.source as Alert["source"], seen: Boolean(r.seen), title: String(r.title),
    year: r.year == null ? null : Number(r.year), poster: (r.poster as string) ?? null, backdrop: (r.backdrop_path as string) ?? null,
    director: (r.director as string) ?? null,
  }));
}

export async function unseenAlerts() {
  try {
    const { rows } = await db().execute("SELECT COUNT(*) AS n FROM alerts WHERE seen = 0");
    return Number(rows[0].n);
  } catch {
    return 0;
  }
}

export async function markAlertsSeen() {
  await db().execute("UPDATE alerts SET seen = 1 WHERE seen = 0");
}
