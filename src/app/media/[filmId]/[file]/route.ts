import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { MEDIA_DIR, MIME } from "@/lib/media";

// Sert mes images et vidéos. Gère les requêtes « Range » pour pouvoir avancer dans une vidéo.
export async function GET(req: Request, { params }: { params: Promise<{ filmId: string; file: string }> }) {
  const { filmId, file } = await params;
  // Pas de « ../ » possible : on n'accepte qu'un identifiant numérique et un nom de fichier simple.
  if (!/^\d+$/.test(filmId) || !/^[\w-]+\.\w+$/.test(file)) return new Response("Introuvable", { status: 404 });
  const full = path.join(MEDIA_DIR, filmId, file);
  const stat = await fs.promises.stat(full).catch(() => null);
  if (!stat) return new Response("Introuvable", { status: 404 });

  const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  const headers = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=31536000, immutable" };
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);

  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    const stream = Readable.toWeb(fs.createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(full)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(stat.size) } });
}
