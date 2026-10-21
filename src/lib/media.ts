import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, ensureSchema } from "./db";

// Les fichiers sont rangés dans data/media/<id du film>/ (jamais envoyés sur GitHub).
export const MEDIA_DIR = path.join(process.cwd(), "data", "media");

export const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".m4v": "video/mp4",
};

export const MAX_SIZE = 500 * 1024 * 1024; // 500 Mo

export type Media = { id: number; filmId: number; kind: "image" | "video" | "youtube"; src: string; caption: string | null; url: string };

let ready: Promise<void> | undefined;
const schema = () => (ready ??= ensureSchema());

const toMedia = (r: Record<string, unknown>): Media => {
  const kind = r.kind as Media["kind"];
  const src = String(r.src);
  return {
    id: Number(r.id), filmId: Number(r.film_id), kind, src, caption: (r.caption as string) ?? null,
    url: kind === "youtube" ? `https://www.youtube-nocookie.com/embed/${src}` : `/media/${r.film_id}/${src}`,
  };
};

export async function filmMedia(filmId: number) {
  await schema();
  const { rows } = await db().execute({ sql: "SELECT * FROM media WHERE film_id = ? ORDER BY created_at DESC, id DESC", args: [filmId] });
  return rows.map(toMedia);
}

export async function addFile(filmId: number, file: File, caption: string | null) {
  const ext = path.extname(file.name).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`Format non pris en charge (${ext || "inconnu"}). Images : jpg, png, webp, gif. Vidéos : mp4, webm, mov.`);
  if (file.size > MAX_SIZE) throw new Error("Fichier trop lourd (500 Mo maximum).");

  await schema();
  const name = `${randomUUID()}${ext}`;
  const dir = path.join(MEDIA_DIR, String(filmId));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  await db().execute({
    sql: "INSERT INTO media (film_id, kind, src, caption) VALUES (?, ?, ?, ?)",
    args: [filmId, mime.startsWith("video") ? "video" : "image", name, caption],
  });
}

// Accepte youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/… ou l'identifiant seul.
export function youtubeId(input: string) {
  const m = input.trim().match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) ?? input.trim().match(/^([\w-]{11})$/);
  return m?.[1] ?? null;
}

export async function addYoutube(filmId: number, url: string, caption: string | null) {
  const id = youtubeId(url);
  if (!id) throw new Error("Lien YouTube non reconnu.");
  await schema();
  await db().execute({ sql: "INSERT INTO media (film_id, kind, src, caption) VALUES (?, 'youtube', ?, ?)", args: [filmId, id, caption] });
}

export async function deleteMedia(id: number) {
  await schema();
  const { rows } = await db().execute({ sql: "SELECT * FROM media WHERE id = ?", args: [id] });
  const m = rows[0];
  if (!m) return null;
  if (m.kind !== "youtube") await fs.rm(path.join(MEDIA_DIR, String(m.film_id), String(m.src)), { force: true });
  await db().execute({ sql: "DELETE FROM media WHERE id = ?", args: [id] });
  return Number(m.film_id);
}

// Enregistre une image (jaquette, affiche…) dans data/media/<film>/ et renvoie son adresse.
export async function saveImage(filmId: number, file: File, prefix: string) {
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  if (!MIME[ext]?.startsWith("image/")) throw new Error("Choisis une image (jpg, png, webp…).");
  if (file.size > MAX_SIZE) throw new Error("Image trop lourde.");
  const name = `${prefix}-${randomUUID()}${ext}`;
  const dir = path.join(MEDIA_DIR, String(filmId));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/media/${filmId}/${name}`;
}
