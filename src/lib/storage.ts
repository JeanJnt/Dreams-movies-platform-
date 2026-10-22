import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, head, put } from "@vercel/blob";

/*
 * Stockage des fichiers (photos, vidéos, jaquettes, affiches).
 * - En ligne (BLOB_READ_WRITE_TOKEN défini par Vercel) : Vercel Blob, en accès PRIVÉ.
 *   Les fichiers ne sont jamais accessibles directement : c'est Dreams qui les sert, après avoir vérifié les droits.
 * - En local : dossier data/media/ (jamais envoyé sur GitHub).
 * Les chemins ont toujours la forme « media/<membre>/<film>/<fichier> ».
 */

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const LOCAL_DIR = path.join(process.cwd(), "data");

export function mediaPath(userId: number, filmId: number, file: string) {
  if (!/^[\w-]+\.\w+$/.test(file)) throw new Error("Nom de fichier invalide");
  return `media/${Number(userId)}/${Number(filmId)}/${file}`;
}

export async function saveFile(pathname: string, data: Buffer, contentType: string) {
  if (blobEnabled()) {
    await put(pathname, data, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
    return;
  }
  const full = path.join(LOCAL_DIR, pathname);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, data);
}

export async function fileExists(pathname: string) {
  if (blobEnabled()) return head(pathname).then(() => true, () => false);
  return fs.promises.stat(path.join(LOCAL_DIR, pathname)).then(() => true, () => false);
}

export async function deleteFile(pathname: string) {
  if (blobEnabled()) {
    await del(pathname).catch(() => {});
    return;
  }
  await fs.promises.rm(path.join(LOCAL_DIR, pathname), { force: true });
}

// Supprime tous les fichiers d'un membre (suppression de compte).
export async function deleteUserFiles(userId: number) {
  if (blobEnabled()) {
    const { list } = await import("@vercel/blob");
    for (let cursor: string | undefined, more = true; more; ) {
      const page = await list({ prefix: `media/${Number(userId)}/`, cursor });
      if (page.blobs.length) await del(page.blobs.map((b) => b.pathname));
      cursor = page.cursor;
      more = page.hasMore;
    }
    return;
  }
  await fs.promises.rm(path.join(LOCAL_DIR, "media", String(Number(userId))), { recursive: true, force: true });
}

// Lit un fichier, éventuellement une partie seulement (« Range », pour avancer dans une vidéo).
export async function readFile(pathname: string, range: string | null): Promise<Response | null> {
  if (blobEnabled()) {
    const res = await get(pathname, { access: "private", headers: range ? { range } : undefined }).catch(() => null);
    if (!res || !res.stream) return null;
    const headers = new Headers();
    for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
      const v = res.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(res.stream, { status: res.headers.get("content-range") ? 206 : 200, headers });
  }

  const full = path.join(LOCAL_DIR, pathname);
  const stat = await fs.promises.stat(full).catch(() => null);
  if (!stat) return null;
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
    return new Response(Readable.toWeb(fs.createReadStream(full, { start, end })) as ReadableStream, {
      status: 206,
      headers: { "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(full)) as ReadableStream, {
    headers: { "Content-Length": String(stat.size), "Accept-Ranges": "bytes" },
  });
}
