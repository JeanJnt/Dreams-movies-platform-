import { db, ensureSchema } from "./db";
import { tmdb } from "./tmdb";
import { applyMovieToFilm, fetchMovie } from "./tmdb-film";

// Complète les films du catalogue avec les infos TMDB (affiche, synopsis, genres, réalisateur…).
// Le travail se fait par petits paquets, pour tenir dans le temps limite d'une requête en ligne.

type SearchResult = { id: number; release_date?: string };

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

async function enrichOne(film: { id: number; name: string; year: number | null; tmdbId: number | null }) {
  // Film ajouté depuis une liste TMDB : on connaît déjà son identifiant. Sinon, on le cherche par titre et année.
  const tmdbId = film.tmdbId ?? (await findMovie(film.name, film.year));
  if (!tmdbId) {
    await db().execute({ sql: "UPDATE films SET tmdb_status = 'not_found' WHERE id = ?", args: [film.id] });
    return false;
  }
  await applyMovieToFilm(film.id, await fetchMovie(tmdbId));
  return true;
}

export async function pendingCount() {
  await ensureSchema();
  const { rows } = await db().execute("SELECT COUNT(*) AS n FROM films WHERE tmdb_status IS NULL OR tmdb_status = 'partial'");
  return Number(rows[0].n);
}

// Traite jusqu'à `limit` films en attente ; renvoie combien il en reste.
export async function enrichBatch(limit = 40, concurrency = 8) {
  await ensureSchema();
  const { rows } = await db().execute({ sql: "SELECT id, name, year, tmdb_id FROM films WHERE tmdb_status IS NULL OR tmdb_status = 'partial' ORDER BY id LIMIT ?", args: [limit] });
  const queue = rows.map((r) => ({ id: Number(r.id), name: String(r.name), year: r.year == null ? null : Number(r.year), tmdbId: r.tmdb_id == null ? null : Number(r.tmdb_id) }));
  const missing: string[] = [];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        if (!(await enrichOne(f))) missing.push(`${f.name} (${f.year ?? "?"})`);
      } catch {
        // erreur réseau ponctuelle : le film sera retenté au prochain paquet
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { done: rows.length, remaining: await pendingCount(), missing };
}
