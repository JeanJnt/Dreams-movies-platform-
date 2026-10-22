import { db } from "./db";
import { removeImage, saveImage } from "./media";
import { uid } from "./auth";
import { tmdb } from "./tmdb";

export type PosterOption = { path: string; lang: string | null; votes: number; width: number };

// Toutes les affiches connues de TMDB pour un film : françaises, anglaises, japonaises, sans texte…
export async function posterOptions(filmId: number): Promise<PosterOption[]> {
  const { rows } = await db().execute({ sql: "SELECT tmdb_id FROM films WHERE id = ?", args: [filmId] });
  const tmdbId = rows[0]?.tmdb_id;
  if (!tmdbId) return [];
  const res = await tmdb<{ posters: { file_path: string; iso_639_1: string | null; vote_count: number; vote_average: number; width: number }[] }>(
    `/movie/${tmdbId}/images`,
    { include_image_language: "fr,en,ja,null" },
    3,
    { next: { revalidate: 60 * 60 * 24 } },
  );
  return res.posters
    .sort((a, b) => b.vote_average * b.vote_count - a.vote_average * a.vote_count)
    .slice(0, 60)
    .map((p) => ({ path: p.file_path, lang: p.iso_639_1, votes: p.vote_count, width: p.width }));
}

export async function currentPoster(filmId: number) {
  const u = await uid();
  const { rows } = await db().execute({
    sql: "SELECT up.poster AS custom, f.poster_path FROM films f LEFT JOIN user_posters up ON up.film_id = f.id AND up.user_id = ? WHERE f.id = ?",
    args: [u, filmId],
  });
  return { custom: (rows[0]?.custom as string) ?? null, original: (rows[0]?.poster_path as string) ?? null };
}

// Chaque membre a ses propres affiches : changer la sienne ne change rien pour les autres.
// path = chemin TMDB, ou null pour revenir à l'affiche d'origine.
export async function setCustomPoster(filmId: number, posterPath: string | null) {
  if (posterPath !== null && !/^\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(posterPath)) throw new Error("Affiche invalide");
  const u = await uid();
  const { custom } = await currentPoster(filmId);
  if (custom) await removeImage(custom);
  if (posterPath) {
    await db().execute({
      sql: "INSERT INTO user_posters (user_id, film_id, poster) VALUES (?, ?, ?) ON CONFLICT(user_id, film_id) DO UPDATE SET poster = excluded.poster",
      args: [u, filmId, posterPath],
    });
  } else {
    await db().execute({ sql: "DELETE FROM user_posters WHERE user_id = ? AND film_id = ?", args: [u, filmId] });
  }
}

// Affiche envoyée depuis mon ordinateur ou mon téléphone.
export async function uploadPoster(filmId: number, file: File) {
  const u = await uid();
  const { custom } = await currentPoster(filmId);
  const url = await saveImage(filmId, file, "poster");
  if (custom) await removeImage(custom);
  await db().execute({
    sql: "INSERT INTO user_posters (user_id, film_id, poster) VALUES (?, ?, ?) ON CONFLICT(user_id, film_id) DO UPDATE SET poster = excluded.poster",
    args: [u, filmId, url],
  });
}

// Affiche déjà envoyée dans le stockage par le navigateur (en ligne) : on vérifie qu'elle est bien à moi, puis on l'utilise.
export async function setUploadedPoster(filmId: number, url: string) {
  const u = await uid();
  const m = url.match(/^\/media\/(\d+)\/(\d+)\/(poster-[\w-]+\.\w+)$/);
  if (!m || Number(m[1]) !== u || Number(m[2]) !== filmId) throw new Error("Affiche invalide");
  const { custom } = await currentPoster(filmId);
  if (custom && custom !== url) await removeImage(custom);
  await db().execute({
    sql: "INSERT INTO user_posters (user_id, film_id, poster) VALUES (?, ?, ?) ON CONFLICT(user_id, film_id) DO UPDATE SET poster = excluded.poster",
    args: [u, filmId, url],
  });
}
