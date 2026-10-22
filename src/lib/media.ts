import path from "node:path";
import { randomUUID } from "node:crypto";
import { deleteFile, fileExists, mediaPath, saveFile } from "./storage";
import { uid } from "./auth";
import { db, ensureSchema } from "./db";

// Les fichiers sont rangés sous media/<id du membre>/<id du film>/ (voir storage.ts : disque en local, Vercel Blob en ligne).
// Ils ne sont servis qu'aux membres connectés qui ont le droit de les voir (voir src/app/media/…/route.ts).

export const MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".m4v": "video/mp4",
};

export const MAX_SIZE = 500 * 1024 * 1024; // 500 Mo

export type Visibility = "membres" | "prive";

export type Media = {
  id: number;
  filmId: number;
  userId: number;
  author: string;
  mine: boolean;
  kind: "image" | "video" | "youtube";
  src: string;
  caption: string | null;
  visibility: Visibility;
  url: string;
};

const toMedia = (r: Record<string, unknown>, me: number): Media => {
  const kind = r.kind as Media["kind"];
  const src = String(r.src);
  return {
    id: Number(r.id), filmId: Number(r.film_id), userId: Number(r.user_id), author: String(r.author ?? ""), mine: Number(r.user_id) === me,
    kind, src, caption: (r.caption as string) ?? null, visibility: (r.visibility as Visibility) ?? "membres",
    url: kind === "youtube" ? `https://www.youtube-nocookie.com/embed/${src}` : `/media/${r.user_id}/${r.film_id}/${src}`,
  };
};

// Les médias d'un film : les miens, et ceux que les autres membres partagent.
export async function filmMedia(filmId: number) {
  await ensureSchema();
  const me = await uid();
  const { rows } = await db().execute({
    sql: `SELECT m.*, u.name AS author FROM media m JOIN users u ON u.id = m.user_id
          WHERE m.film_id = ? AND (m.user_id = ? OR m.visibility = 'membres')
          ORDER BY (m.user_id = ?) DESC, m.created_at DESC, m.id DESC`,
    args: [filmId, me, me],
  });
  return rows.map((r) => toMedia(r, me));
}

async function store(userId: number, filmId: number, name: string, file: File) {
  const mime = MIME[path.extname(name).toLowerCase()] ?? "application/octet-stream";
  await saveFile(mediaPath(userId, filmId, name), Buffer.from(await file.arrayBuffer()), mime);
}

// Fichier envoyé directement par le navigateur vers le stockage en ligne (vidéos lourdes) : on l'enregistre ensuite.
export async function registerUploaded(filmId: number, name: string, caption: string | null, visibility: Visibility) {
  const me = await uid();
  const mime = MIME[path.extname(name).toLowerCase()];
  if (!mime || !/^[\w-]+\.\w+$/.test(name)) throw new Error("Fichier invalide");
  if (!(await fileExists(mediaPath(me, filmId, name)))) throw new Error("Fichier introuvable");
  await db().execute({
    sql: "INSERT INTO media (user_id, film_id, kind, src, caption, visibility) VALUES (?, ?, ?, ?, ?, ?)",
    args: [me, filmId, mime.startsWith("video") ? "video" : "image", name, caption, visibility],
  });
}

export async function addFile(filmId: number, file: File, caption: string | null, visibility: Visibility) {
  const ext = path.extname(file.name).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`Format non pris en charge (${ext || "inconnu"}). Images : jpg, png, webp, gif. Vidéos : mp4, webm, mov.`);
  if (file.size > MAX_SIZE) throw new Error("Fichier trop lourd (500 Mo maximum).");
  await ensureSchema();
  const me = await uid();
  const name = `${randomUUID()}${ext}`;
  await store(me, filmId, name, file);
  await db().execute({
    sql: "INSERT INTO media (user_id, film_id, kind, src, caption, visibility) VALUES (?, ?, ?, ?, ?, ?)",
    args: [me, filmId, mime.startsWith("video") ? "video" : "image", name, caption, visibility],
  });
}

// Accepte youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/… ou l'identifiant seul.
export function youtubeId(input: string) {
  const m = input.trim().match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) ?? input.trim().match(/^([\w-]{11})$/);
  return m?.[1] ?? null;
}

export async function addYoutube(filmId: number, url: string, caption: string | null, visibility: Visibility) {
  const id = youtubeId(url);
  if (!id) throw new Error("Lien YouTube non reconnu.");
  await ensureSchema();
  await db().execute({
    sql: "INSERT INTO media (user_id, film_id, kind, src, caption, visibility) VALUES (?, ?, 'youtube', ?, ?, ?)",
    args: [await uid(), filmId, id, caption, visibility],
  });
}

// On ne peut supprimer que ses propres médias.
export async function deleteMedia(id: number) {
  await ensureSchema();
  const me = await uid();
  const { rows } = await db().execute({ sql: "SELECT * FROM media WHERE id = ? AND user_id = ?", args: [id, me] });
  const m = rows[0];
  if (!m) return null;
  if (m.kind !== "youtube") await deleteFile(mediaPath(me, Number(m.film_id), String(m.src)));
  await db().execute({ sql: "DELETE FROM media WHERE id = ? AND user_id = ?", args: [id, me] });
  return Number(m.film_id);
}

export async function setMediaVisibility(id: number, visibility: Visibility) {
  const res = await db().execute({ sql: "UPDATE media SET visibility = ? WHERE id = ? AND user_id = ?", args: [visibility, id, await uid()] });
  return res.rowsAffected > 0;
}

// Enregistre une image (jaquette, affiche…) et renvoie son adresse.
export async function saveImage(filmId: number, file: File, prefix: "cover" | "poster") {
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  if (!MIME[ext]?.startsWith("image/")) throw new Error("Choisis une image (jpg, png, webp…).");
  if (file.size > 20 * 1024 * 1024) throw new Error("Image trop lourde (20 Mo maximum).");
  const me = await uid();
  const name = `${prefix}-${randomUUID()}${ext}`;
  await store(me, filmId, name, file);
  return `/media/${me}/${filmId}/${name}`;
}

export async function removeImage(url: string) {
  const me = await uid();
  const m = url.match(/^\/media\/(\d+)\/(\d+)\/((?:cover|poster)-[\w-]+\.\w+)$/);
  if (m && Number(m[1]) === me) await deleteFile(mediaPath(me, Number(m[2]), m[3]));
}

// Qui a le droit de voir un fichier ? Son auteur, et les membres si le média est partagé.
// Les jaquettes et affiches personnalisées sont visibles des membres (elles apparaissent sur les profils).
export async function canView(viewer: number, owner: number, file: string) {
  if (viewer === owner) return true;
  if (/^(cover|poster)-/.test(file)) return true;
  const { rows } = await db().execute({ sql: "SELECT visibility FROM media WHERE user_id = ? AND src = ?", args: [owner, file] });
  return rows[0]?.visibility === "membres";
}
