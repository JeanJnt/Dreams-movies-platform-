import { uid } from "./auth";
import { db } from "./db";
import { dominantColor } from "./disc-style";
import { removeImage, saveImage } from "./media";
import { backdrop, tmdb } from "./tmdb";

// Les images choisies par chaque membre pour un film : le fond de la fiche et l'image du disque.
// Comme les affiches, elles sont à chacun : les changer ne change rien pour les autres.

export const IMAGE_KINDS = ["backdrop", "disc"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];
export const isImageKind = (k: string): k is ImageKind => IMAGE_KINDS.includes(k as ImageKind);

export type ImageOption = { path: string; lang: string | null; shape: "wide" | "tall" };

type TmdbImage = { file_path: string; iso_639_1: string | null; vote_count: number; vote_average: number };

const best = (list: TmdbImage[], shape: ImageOption["shape"]): ImageOption[] =>
  list
    .sort((a, b) => b.vote_average * b.vote_count - a.vote_average * a.vote_count)
    .slice(0, 60)
    .map((i) => ({ path: i.file_path, lang: i.iso_639_1, shape }));

// Les images connues de TMDB pour un film ou une série : les fonds d'abord, puis les affiches.
export async function imageOptions(filmId: number): Promise<{ backdrops: ImageOption[]; posters: ImageOption[] }> {
  const { rows } = await db().execute({ sql: "SELECT tmdb_id, tmdb_tv_id, media_type FROM films WHERE id = ?", args: [filmId] });
  const tv = rows[0]?.media_type === "tv";
  const tmdbId = tv ? rows[0]?.tmdb_tv_id : rows[0]?.tmdb_id;
  if (!tmdbId) return { backdrops: [], posters: [] };
  const res = await tmdb<{ backdrops: TmdbImage[]; posters: TmdbImage[] }>(
    `/${tv ? "tv" : "movie"}/${tmdbId}/images`,
    { include_image_language: "fr,en,ja,null" },
    3,
    { next: { revalidate: 60 * 60 * 24 } },
  );
  return { backdrops: best(res.backdrops, "wide"), posters: best(res.posters, "tall") };
}

export async function filmImages(filmId: number): Promise<Record<ImageKind, string | null>> {
  const { rows } = await db().execute({ sql: "SELECT kind, image FROM film_images WHERE user_id = ? AND film_id = ?", args: [await uid(), filmId] });
  const of = (k: ImageKind) => (rows.find((r) => r.kind === k)?.image as string) ?? null;
  return { backdrop: of("backdrop"), disc: of("disc") };
}

// image = chemin TMDB ou image envoyée, null pour revenir à l'image d'origine.
async function store(filmId: number, kind: ImageKind, image: string | null) {
  const u = await uid();
  const previous = (await filmImages(filmId))[kind];
  if (previous && previous !== image) await removeImage(previous);
  if (!image) {
    await db().execute({ sql: "DELETE FROM film_images WHERE user_id = ? AND film_id = ? AND kind = ?", args: [u, filmId, kind] });
    return;
  }
  const color = await dominantColor(backdrop(image)!).catch(() => null);
  await db().execute({
    sql: "INSERT INTO film_images (user_id, film_id, kind, image, color) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, film_id, kind) DO UPDATE SET image = excluded.image, color = excluded.color",
    args: [u, filmId, kind, image, color],
  });
  // La maquette « typo » n'a pas d'image : on la quitte, sinon le choix ne se verrait pas sur le disque.
  if (kind === "disc") await db().execute({ sql: "DELETE FROM disc_styles WHERE user_id = ? AND film_id = ? AND variant = 'typo'", args: [u, filmId] });
}

export async function setFilmImage(filmId: number, kind: ImageKind, path: string | null) {
  if (path !== null && !/^\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(path)) throw new Error("Image invalide");
  await store(filmId, kind, path);
}

// Image envoyée depuis mon ordinateur ou mon téléphone.
export async function uploadFilmImage(filmId: number, kind: ImageKind, file: File) {
  await store(filmId, kind, await saveImage(filmId, file, kind));
}

// Image déjà envoyée dans le stockage par le navigateur (en ligne) : on vérifie qu'elle est bien à moi, puis on l'utilise.
export async function setUploadedFilmImage(filmId: number, kind: ImageKind, url: string) {
  const m = url.match(/^\/media\/(\d+)\/(\d+)\/([a-z]+)-[\w-]+\.\w+$/);
  if (!m || Number(m[1]) !== (await uid()) || Number(m[2]) !== filmId || m[3] !== kind) throw new Error("Image invalide");
  await store(filmId, kind, url);
}
