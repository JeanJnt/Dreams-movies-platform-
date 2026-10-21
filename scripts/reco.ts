/**
 * Calcule les recommandations à partir de mes films préférés, et récupère les plateformes
 * (Netflix, Prime…) des films de ma watchlist.
 *
 *   npm run reco
 *
 * À relancer de temps en temps : les catalogues des plateformes changent chaque mois.
 */
import { db, ensureSchema } from "../src/lib/db";
import { tmdb } from "../src/lib/tmdb";
import { fetchMovie, saveProviders } from "../src/lib/tmdb-film";

const CONCURRENCY = 8;
const MAX_SEEDS = 200;
const MAX_CANDIDATES = 500;

async function pool<T>(items: T[], fn: (item: T) => Promise<void>, label: string) {
  const queue = [...items];
  let done = 0;
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      try {
        await fn(item);
      } catch (e) {
        console.error(`\n⚠️  ${(e as Error).message}`);
      }
      done++;
      if (done % 20 === 0 || done === items.length) process.stdout.write(`\r${label} : ${done}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n");
}

async function main() {
  await ensureSchema();
  const client = db();

  // 1. Les « graines » : films notés 4★ ou plus, ou coups de cœur.
  const { rows: seedRows } = await client.execute(`
    SELECT f.tmdb_id, COALESCE(f.title_fr, f.name) AS title, r.rating, (l.film_id IS NOT NULL) AS liked
    FROM watched w JOIN films f ON f.id = w.film_id
    LEFT JOIN ratings r ON r.film_id = f.id LEFT JOIN likes l ON l.film_id = f.id
    WHERE f.tmdb_id IS NOT NULL AND (r.rating >= 4 OR l.film_id IS NOT NULL)
      AND (f.runtime IS NULL OR f.runtime >= 60) -- pas les courts-métrages ni les making-of
    ORDER BY liked DESC, r.rating DESC LIMIT ${MAX_SEEDS}`);
  const seeds = seedRows.map((r) => ({
    tmdbId: Number(r.tmdb_id),
    title: String(r.title),
    // 4★ → 1, 4,5★ → 1,5, 5★ → 2, +1 pour un coup de cœur
    weight: (r.rating == null ? 4 : Number(r.rating)) - 3 + (r.liked ? 1 : 0),
  }));

  const { rows: seenRows } = await client.execute(
    "SELECT f.tmdb_id FROM watched w JOIN films f ON f.id = w.film_id WHERE f.tmdb_id IS NOT NULL",
  );
  const seen = new Set(seenRows.map((r) => Number(r.tmdb_id)));

  // 2. Pour chaque graine, les recommandations TMDB. Un film recommandé par plusieurs de mes favoris monte en tête.
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
  }, "Analyse de tes favoris");

  const top = [...candidates.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, MAX_CANDIDATES);

  // 3. Détails + plateformes de chaque film recommandé.
  await client.execute("DELETE FROM reco");
  await pool(top, async ([tmdbId, c]) => {
    const m = await fetchMovie(tmdbId);
    const reasons = c.reasons.sort((a, b) => b.weight - a.weight).slice(0, 3).map((r) => r.title);
    await client.execute({
      sql: `INSERT OR REPLACE INTO reco (tmdb_id, score, reasons, title, original_title, year, poster_path, runtime,
            genres, directors, vote_average, vote_count, overview) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [tmdbId, c.score, JSON.stringify(reasons), m.title, m.originalTitle, m.year, m.posterPath, m.runtime,
        JSON.stringify(m.genres), JSON.stringify(m.directors), m.voteAverage, m.voteCount, m.overview],
    });
    await saveProviders(tmdbId, m.flatrate);
  }, "Films recommandés");

  // 4. Plateformes des films de la watchlist.
  const { rows: wl } = await client.execute(
    "SELECT f.tmdb_id FROM watchlist w JOIN films f ON f.id = w.film_id WHERE f.tmdb_id IS NOT NULL",
  );
  await pool(wl.map((r) => Number(r.tmdb_id)), async (tmdbId) => {
    const res = await tmdb<{ results?: { FR?: { flatrate?: { provider_name: string; logo_path: string }[] } } }>(
      `/movie/${tmdbId}/watch/providers`,
    );
    await saveProviders(tmdbId, (res.results?.FR?.flatrate ?? []).map((p) => ({ name: p.provider_name, logo: p.logo_path })));
  }, "Plateformes de la watchlist");

  console.log(`✅ ${top.length} films recommandés à partir de ${seeds.length} favoris.`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
