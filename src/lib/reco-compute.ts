import { db, ensureSchema } from "./db";
import { tmdb } from "./tmdb";
import { fetchMovie, saveProviders } from "./tmdb-film";

/*
 * Calcul des recommandations d'un membre, en plusieurs étapes courtes
 * (chacune tient dans le temps limite d'une requête en ligne) :
 *   1. « graines » : ses films notés 4★+ et coups de cœur → recommandations TMDB → candidats classés
 *   2. « détails » : infos et plateformes des candidats, par paquets de 40
 *   3. « plateformes » : où voir les films de sa watchlist, par paquets de 80
 * La file d'attente est gardée dans settings (clé reco_queue) entre deux étapes.
 */

const MAX_SEEDS = 150;
const MAX_CANDIDATES = 400;

type Candidate = [tmdbId: number, score: number, reasons: string[]];

async function pool<T>(items: T[], fn: (item: T) => Promise<void>, concurrency = 8) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item).catch(() => {});
    }),
  );
}

async function getQueue(u: number): Promise<Candidate[]> {
  const { rows } = await db().execute({ sql: "SELECT value FROM settings WHERE user_id = ? AND key = 'reco_queue'", args: [u] });
  return rows[0] ? JSON.parse(String(rows[0].value)) : [];
}

async function setQueue(u: number, queue: Candidate[]) {
  await db().execute({
    sql: "INSERT INTO settings (user_id, key, value) VALUES (?, 'reco_queue', ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
    args: [u, JSON.stringify(queue)],
  });
}

// Étape 1 : à partir des favoris du membre, la liste des films à recommander.
export async function recoSeeds(userId: number) {
  await ensureSchema();
  const u = Number(userId);
  const { rows: seedRows } = await db().execute(`
    SELECT f.tmdb_id, COALESCE(f.title_fr, f.name) AS title, r.rating, (l.film_id IS NOT NULL) AS liked
    FROM watched w JOIN films f ON f.id = w.film_id
    LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u} LEFT JOIN likes l ON l.film_id = f.id AND l.user_id = ${u}
    WHERE w.user_id = ${u} AND f.tmdb_id IS NOT NULL AND (r.rating >= 4 OR l.film_id IS NOT NULL)
      AND (f.runtime IS NULL OR f.runtime >= 60) -- pas les courts-métrages ni les making-of
    ORDER BY liked DESC, r.rating DESC LIMIT ${MAX_SEEDS}`);
  const seeds = seedRows.map((r) => ({
    tmdbId: Number(r.tmdb_id),
    title: String(r.title),
    // 4★ → 1, 4,5★ → 1,5, 5★ → 2, +1 pour un coup de cœur
    weight: (r.rating == null ? 4 : Number(r.rating)) - 3 + (r.liked ? 1 : 0),
  }));
  const { rows: seenRows } = await db().execute(`SELECT f.tmdb_id FROM watched w JOIN films f ON f.id = w.film_id WHERE w.user_id = ${u} AND f.tmdb_id IS NOT NULL`);
  const seen = new Set(seenRows.map((r) => Number(r.tmdb_id)));

  // Un film recommandé par plusieurs favoris monte en tête.
  const candidates = new Map<number, { score: number; reasons: { title: string; weight: number }[] }>();
  await pool(seeds, async (seed) => {
    const res = await tmdb<{ results: { id: number }[] }>(`/movie/${seed.tmdbId}/recommendations`);
    res.results.slice(0, 20).forEach((m, rank) => {
      if (seen.has(m.id)) return;
      const c = candidates.get(m.id) ?? { score: 0, reasons: [] };
      c.score += seed.weight * (1 - rank / 25);
      c.reasons.push({ title: seed.title, weight: seed.weight });
      candidates.set(m.id, c);
    });
  }, 10);

  const queue: Candidate[] = [...candidates.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_CANDIDATES)
    .map(([id, c]) => [id, c.score, c.reasons.sort((a, b) => b.weight - a.weight).slice(0, 3).map((r) => r.title)]);
  await db().execute({ sql: "DELETE FROM reco WHERE user_id = ?", args: [u] });
  await setQueue(u, queue);
  return { seeds: seeds.length, candidates: queue.length };
}

// Étape 2 : infos et plateformes du paquet suivant de candidats. Renvoie combien il en reste.
export async function recoDetails(userId: number, batch = 40) {
  const u = Number(userId);
  const queue = await getQueue(u);
  const now = queue.splice(0, batch);
  await pool(now, async ([tmdbId, score, reasons]) => {
    const m = await fetchMovie(tmdbId);
    await db().execute({
      sql: `INSERT OR REPLACE INTO reco (user_id, tmdb_id, score, reasons, title, original_title, year, poster_path, runtime,
            genres, directors, vote_average, vote_count, overview) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [u, tmdbId, score, JSON.stringify(reasons), m.title, m.originalTitle, m.year, m.posterPath, m.runtime,
        JSON.stringify(m.genres), JSON.stringify(m.directors), m.voteAverage, m.voteCount, m.overview],
    });
    await saveProviders(tmdbId, m.flatrate);
  });
  await setQueue(u, queue);
  return { remaining: queue.length };
}

// Étape 3 : plateformes des films de la watchlist (seulement celles inconnues ou vieilles de plus de 2 semaines).
export async function recoWatchlistProviders(userId: number, batch = 80) {
  const u = Number(userId);
  const sql = `SELECT f.tmdb_id FROM watchlist w JOIN films f ON f.id = w.film_id
     LEFT JOIN providers p ON p.tmdb_id = f.tmdb_id
     WHERE w.user_id = ${u} AND f.tmdb_id IS NOT NULL AND (p.tmdb_id IS NULL OR p.fetched_at < datetime('now', '-14 days'))`;
  const { rows } = await db().execute(`${sql} LIMIT ${batch}`);
  await pool(rows.map((r) => Number(r.tmdb_id)), async (tmdbId) => {
    const res = await tmdb<{ results?: { FR?: { flatrate?: { provider_name: string; logo_path: string }[] } } }>(`/movie/${tmdbId}/watch/providers`);
    await saveProviders(tmdbId, (res.results?.FR?.flatrate ?? []).map((p) => ({ name: p.provider_name, logo: p.logo_path })));
  });
  const left = await db().execute(`SELECT COUNT(*) AS n FROM (${sql})`);
  return { remaining: Number(left.rows[0].n) };
}
