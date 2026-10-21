import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { MAX_SIZE, MEDIA_DIR, MIME } from "./media";
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
  const { rows } = await db().execute({ sql: "SELECT custom_poster, poster_path FROM films WHERE id = ?", args: [filmId] });
  return { custom: (rows[0]?.custom_poster as string) ?? null, original: (rows[0]?.poster_path as string) ?? null };
}

async function removeUploadedPoster(filmId: number) {
  const { custom } = await currentPoster(filmId);
  if (custom?.startsWith(`/media/${filmId}/poster-`)) {
    await fs.rm(path.join(MEDIA_DIR, String(filmId), path.basename(custom)), { force: true });
  }
}

// path = chemin TMDB, ou null pour revenir à l'affiche d'origine.
export async function setCustomPoster(filmId: number, posterPath: string | null) {
  if (posterPath !== null && !/^\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(posterPath)) throw new Error("Affiche invalide");
  await removeUploadedPoster(filmId);
  await db().execute({ sql: "UPDATE films SET custom_poster = ? WHERE id = ?", args: [posterPath, filmId] });
}

// Affiche envoyée depuis mon ordinateur ou mon téléphone.
export async function uploadPoster(filmId: number, file: File) {
  const ext = path.extname(file.name).toLowerCase();
  if (!MIME[ext]?.startsWith("image/")) throw new Error("Choisis une image (jpg, png, webp…).");
  if (file.size > MAX_SIZE) throw new Error("Image trop lourde.");
  await removeUploadedPoster(filmId);
  const name = `poster-${randomUUID()}${ext}`;
  const dir = path.join(MEDIA_DIR, String(filmId));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  await db().execute({ sql: "UPDATE films SET custom_poster = ? WHERE id = ?", args: [`/media/${filmId}/${name}`, filmId] });
}
