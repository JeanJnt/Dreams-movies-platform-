/**
 * Complète chaque film avec les infos TMDB (affiche, synopsis, genres, réalisateur…).
 *
 *   npm run enrich            → seulement les films pas encore traités
 *   npm run enrich -- --all   → tout re-télécharger
 */
import { db, ensureSchema } from "../src/lib/db";
import { tmdb } from "../src/lib/tmdb";

const CONCURRENCY = 8;

type SearchResult = { id: number; title: string; original_title: string; release_date?: string; popularity: number };

async function findMovie(name: string, year: number | null): Promise<number | null> {
  // D'abord avec l'année exacte, puis ±1 an (les dates de sortie varient selon les pays), puis sans.
  const attempts: Record<string, string>[] = year
    ? [{ query: name, primary_release_year: String(year) }, { query: name, year: String(year) }, { query: name }]
    : [{ query: name }];
  for (const params of attempts) {
    const res = await tmdb<{ results: SearchResult[] }>("/search/movie", params);
    let results = res.results;
    if (year && !params.primary_release_year && !params.year) {
      results = results.filter((r) => r.release_date && Math.abs(Number(r.release_date.slice(0, 4)) - year) <= 1);
    }
    if (results.length) return results[0].id;
  }
  return null;
}

type Details = {
  title: string;
  original_title: string;
  overview: string;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  genres: { name: string }[];
  production_countries: { name: string }[];
  credits: { cast: { name: string; character: string }[]; crew: { name: string; job: string }[] };
};

async function enrich(film: { id: number; name: string; year: number | null }) {
  const tmdbId = await findMovie(film.name, film.year);
  if (!tmdbId) {
    await db().execute({ sql: "UPDATE films SET tmdb_status = 'not_found' WHERE id = ?", args: [film.id] });
    return false;
  }
  const d = await tmdb<Details>(`/movie/${tmdbId}`, { append_to_response: "credits" });
  await db().execute({
    sql: `UPDATE films SET tmdb_id = ?, title_fr = ?, original_title = ?, overview = ?, runtime = ?,
          poster_path = ?, backdrop_path = ?, original_language = ?, genres = ?, countries = ?,
          directors = ?, cast_list = ?, tmdb_status = 'ok' WHERE id = ?`,
    args: [
      tmdbId, d.title, d.original_title, d.overview || null, d.runtime || null,
      d.poster_path, d.backdrop_path, d.original_language,
      JSON.stringify(d.genres.map((g) => g.name)),
      JSON.stringify(d.production_countries.map((c) => c.name)),
      JSON.stringify([...new Set(d.credits.crew.filter((c) => c.job === "Director").map((c) => c.name))]),
      JSON.stringify(d.credits.cast.slice(0, 12).map((c) => ({ name: c.name, character: c.character }))),
      film.id,
    ],
  });
  return true;
}

async function main() {
  await ensureSchema();
  const all = process.argv.includes("--all");
  const { rows } = await db().execute(
    `SELECT id, name, year FROM films ${all ? "" : "WHERE tmdb_status IS NULL"} ORDER BY id`,
  );
  const queue = rows.map((r) => ({ id: Number(r.id), name: String(r.name), year: r.year == null ? null : Number(r.year) }));
  const total = queue.length;
  if (!total) return console.log("Tous les films sont déjà enrichis ✅");

  let done = 0, found = 0;
  const missing: string[] = [];
  const worker = async () => {
    for (let film = queue.shift(); film; film = queue.shift()) {
      try {
        if (await enrich(film)) found++;
        else missing.push(`${film.name} (${film.year})`);
      } catch (e) {
        console.error(`\n⚠️  ${film.name} : ${(e as Error).message}`);
      }
      done++;
      if (done % 25 === 0 || done === total) process.stdout.write(`\r${done}/${total} films traités…`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n✅ ${found} films enrichis.`);
  if (missing.length) console.log(`❓ Introuvables sur TMDB (${missing.length}) :\n  ${missing.join("\n  ")}`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
