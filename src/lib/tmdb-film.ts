import { db, ensureSchema } from "./db";
import { tmdb } from "./tmdb";

export type ProviderLite = { name: string; logo: string };

export type Movie = {
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string | null;
  runtime: number | null;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  originalLanguage: string;
  genres: string[];
  countries: string[];
  directors: string[];
  cast: { name: string; character: string }[];
  voteAverage: number;
  voteCount: number;
  flatrate: ProviderLite[];
};

type Raw = {
  title: string;
  original_title: string;
  overview: string;
  runtime: number | null;
  release_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  vote_average: number;
  vote_count: number;
  genres: { name: string }[];
  production_countries: { name: string }[];
  credits: { cast: { name: string; character: string }[]; crew: { name: string; job: string }[] };
  "watch/providers"?: { results?: { FR?: { flatrate?: { provider_name: string; logo_path: string }[] } } };
};

// Toutes les infos d'un film en un seul appel (détails + équipe + plateformes en France).
export async function fetchMovie(tmdbId: number): Promise<Movie> {
  const d = await tmdb<Raw>(`/movie/${tmdbId}`, { append_to_response: "credits,watch/providers" });
  return {
    tmdbId,
    title: d.title,
    originalTitle: d.original_title,
    overview: d.overview || null,
    runtime: d.runtime || null,
    year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    originalLanguage: d.original_language,
    genres: d.genres.map((g) => g.name),
    countries: d.production_countries.map((c) => c.name),
    directors: [...new Set(d.credits.crew.filter((c) => c.job === "Director").map((c) => c.name))],
    cast: d.credits.cast.slice(0, 12).map((c) => ({ name: c.name, character: c.character })),
    voteAverage: d.vote_average,
    voteCount: d.vote_count,
    flatrate: (d["watch/providers"]?.results?.FR?.flatrate ?? []).map((p) => ({ name: p.provider_name, logo: p.logo_path })),
  };
}

export async function saveProviders(tmdbId: number, flatrate: ProviderLite[]) {
  await db().execute({
    sql: `INSERT INTO providers (tmdb_id, flatrate) VALUES (?, ?)
          ON CONFLICT(tmdb_id) DO UPDATE SET flatrate = excluded.flatrate, fetched_at = datetime('now')`,
    args: [tmdbId, JSON.stringify(flatrate)],
  });
}

export async function applyMovieToFilm(filmId: number, m: Movie) {
  await db().execute({
    sql: `UPDATE films SET tmdb_id = ?, title_fr = ?, original_title = ?, overview = ?, runtime = ?,
          poster_path = ?, backdrop_path = ?, original_language = ?, genres = ?, countries = ?,
          directors = ?, cast_list = ?, tmdb_status = 'ok' WHERE id = ?`,
    args: [
      m.tmdbId, m.title, m.originalTitle, m.overview, m.runtime, m.posterPath, m.backdropPath, m.originalLanguage,
      JSON.stringify(m.genres), JSON.stringify(m.countries), JSON.stringify(m.directors), JSON.stringify(m.cast), filmId,
    ],
  });
  await saveProviders(m.tmdbId, m.flatrate);
}

// Retrouve (ou crée) la fiche Dreams d'un film TMDB : sert aux films recommandés ou trouvés par la recherche.
export async function ensureFilmFromTmdb(tmdbId: number): Promise<number> {
  await ensureSchema();
  const existing = await db().execute({ sql: "SELECT id FROM films WHERE tmdb_id = ?", args: [tmdbId] });
  if (existing.rows[0]) return Number(existing.rows[0].id);

  // Même clé que l'import Letterboxd (titre anglais|année), pour ne pas créer de doublon au prochain import.
  const [movie, en] = await Promise.all([fetchMovie(tmdbId), tmdb<{ title: string }>(`/movie/${tmdbId}`, { language: "en-US" })]);
  const key = `${en.title}|${movie.year ?? ""}`;
  await db().execute({
    sql: "INSERT INTO films (key, name, year) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING",
    args: [key, en.title, movie.year],
  });
  const { rows } = await db().execute({ sql: "SELECT id FROM films WHERE key = ?", args: [key] });
  const id = Number(rows[0].id);
  await applyMovieToFilm(id, movie);
  return id;
}
