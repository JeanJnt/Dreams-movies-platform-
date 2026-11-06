// Relais pour les images de TMDB utilisées en WebGL (projection des fiches et de l'accueil).
// Le CDN de TMDB n'autorise pas les autres sites à lire ses pixels (CORS) : on les sert depuis Dreams.
// Strictement limité aux images TMDB (taille et nom de fichier vérifiés), et gardé en cache un an.
const SIZES = new Set(["w300", "w780", "w1280", "original", "w342", "w500"]);
const FILE = /^\/[A-Za-z0-9_-]{4,64}\.(jpg|jpeg|png|webp)$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const s = searchParams.get("s") ?? "w1280";
  const p = searchParams.get("p") ?? "";
  if (!SIZES.has(s) || !FILE.test(p)) return new Response("Image invalide", { status: 400 });

  const res = await fetch(`https://image.tmdb.org/t/p/${s}${p}`, { cache: "force-cache" });
  if (!res.ok || !res.body) return new Response("Image introuvable", { status: 404 });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
