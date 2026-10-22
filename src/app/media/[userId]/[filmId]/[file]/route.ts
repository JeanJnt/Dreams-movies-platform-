import path from "node:path";
import { currentUser } from "@/lib/auth";
import { canView, MIME } from "@/lib/media";
import { mediaPath, readFile } from "@/lib/storage";

// Sert les images et vidéos des membres, uniquement aux membres connectés qui ont le droit de les voir.
// Gère les requêtes « Range » pour pouvoir avancer dans une vidéo.
export async function GET(req: Request, { params }: { params: Promise<{ userId: string; filmId: string; file: string }> }) {
  const { userId, filmId, file } = await params;
  // Pas de « ../ » possible : identifiants numériques et nom de fichier simple uniquement.
  if (!/^\d+$/.test(userId) || !/^\d+$/.test(filmId) || !/^[\w-]+\.\w+$/.test(file)) return new Response("Introuvable", { status: 404 });
  const viewer = await currentUser();
  if (!viewer) return new Response("Connexion requise", { status: 401 });
  if (!(await canView(viewer.id, Number(userId), file))) return new Response("Introuvable", { status: 404 });

  const res = await readFile(mediaPath(Number(userId), Number(filmId), file), req.headers.get("range"));
  if (!res) return new Response("Introuvable", { status: 404 });
  res.headers.set("Content-Type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
  res.headers.set("Cache-Control", "private, max-age=86400"); // jamais gardé par un serveur intermédiaire
  res.headers.set("X-Content-Type-Options", "nosniff");
  return res;
}
