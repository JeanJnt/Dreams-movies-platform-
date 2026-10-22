import { db, ensureSchema } from "./db";
import { tmdb } from "./tmdb";
import { pickTranslations, searchText } from "./titles";

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
  titles: Record<string, string>;
};

export type Translations = { translations: { iso_639_1: string; iso_3166_1: string; data?: { title?: string } }[] };

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
  translations?: Translations;
  "watch/providers"?: { results?: { FR?: { flatrate?: { provider_name: string; logo_path: string }[] } } };
};

// Toutes les infos d'un film en un seul appel (détails + équipe + plateformes en France).
export async function fetchMovie(tmdbId: number): Promise<Movie> {
  const d = await tmdb<Raw>(`/movie/${tmdbId}`, { append_to_response: "credits,watch/providers,translations" });
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
    titles: pickTranslations(d.translations?.translations ?? [], { language: d.original_language, title: d.original_title }),
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
          directors = ?, cast_list = ?, titles = ?, tmdb_status = 'ok' WHERE id = ?`,
    args: [
      m.tmdbId, m.title, m.originalTitle, m.overview, m.runtime, m.posterPath, m.backdropPath, m.originalLanguage,
      JSON.stringify(m.genres), JSON.stringify(m.countries), JSON.stringify(m.directors), JSON.stringify(m.cast), JSON.stringify(m.titles), filmId,
    ],
  });
  await Promise.all([saveProviders(m.tmdbId, m.flatrate), refreshSearchText(filmId)]);
}

// Recalcule le texte de recherche d'un film (tous ses titres, sans accents).
export async function refreshSearchText(filmId: number) {
  const { rows } = await db().execute({ sql: "SELECT name, title_fr, original_title, titles FROM films WHERE id = ?", args: [filmId] });
  const r = rows[0];
  if (!r) return;
  const text = searchText({ name: String(r.name), title_fr: r.title_fr as string | null, original_title: r.original_title as string | null, titles: r.titles as string | null });
  await db().execute({ sql: "UPDATE films SET search_text = ? WHERE id = ?", args: [text, filmId] });
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

// --- Séries (Letterboxd contient aussi des séries et mini-séries : Twin Peaks: The Return, Chernobyl…) ---
// Leur identifiant TMDB de série va dans tmdb_tv_id (tmdb_id reste vide : il désigne toujours un film).

type RawTv = {
  name: string;
  original_name: string;
  overview: string;
  episode_run_time?: number[];
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  genres: { name: string }[];
  production_countries?: { name: string }[];
  created_by?: { name: string }[];
  credits: { cast: { name: string; character: string }[]; crew: { name: string; job: string }[] };
  translations?: { translations: { iso_639_1: string; iso_3166_1: string; data?: { name?: string } }[] };
};

export async function applyTvToFilm(filmId: number, tvId: number) {
  const d = await tmdb<RawTv>(`/tv/${tvId}`, { append_to_response: "credits,translations" });
  // Les créateurs de la série tiennent lieu de réalisateurs (sinon, les réalisateurs crédités)
  const directors = d.created_by?.length ? d.created_by.map((c) => c.name) : [...new Set(d.credits.crew.filter((c) => c.job === "Director").map((c) => c.name))];
  const translations = (d.translations?.translations ?? []).map((t) => ({ ...t, data: { title: t.data?.name } }));
  const titles = pickTranslations(translations, { language: d.original_language, title: d.original_name });
  await db().execute({
    sql: `UPDATE films SET tmdb_id = NULL, tmdb_tv_id = ?, media_type = 'tv', title_fr = ?, original_title = ?, overview = ?, runtime = ?,
          poster_path = ?, backdrop_path = ?, original_language = ?, genres = ?, countries = ?, directors = ?, cast_list = ?, titles = ?,
          tmdb_status = 'ok' WHERE id = ?`,
    args: [
      tvId, d.name, d.original_name, d.overview || null, d.episode_run_time?.[0] ?? null, d.poster_path, d.backdrop_path, d.original_language,
      JSON.stringify(d.genres.map((g) => g.name)), JSON.stringify((d.production_countries ?? []).map((c) => c.name)), JSON.stringify(directors),
      JSON.stringify(d.credits.cast.slice(0, 12).map((c) => ({ name: c.name, character: c.character }))), JSON.stringify(titles), filmId,
    ],
  });
  await refreshSearchText(filmId);
}
