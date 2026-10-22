import sharp from "sharp";
import { uid, viewedUser } from "./auth";
import { db } from "./db";

// L'habillage des disques : la couleur dominante de l'image du film (calculée une fois, gardée dans films.disc_color)
// et la maquette choisie par le membre pour ce film (sinon, choix automatique).

export const DISC_VARIANTS = [
  { key: "photo", label: "Photo" },
  { key: "bande", label: "Bande" },
  { key: "typo", label: "Typo" },
  { key: "duo", label: "Bichromie" },
] as const;
export type DiscVariant = (typeof DISC_VARIANTS)[number]["key"];
export const isDiscVariant = (v: string): v is DiscVariant => DISC_VARIANTS.some((d) => d.key === v);

export type DiscStyle = { color: string | null; variant: DiscVariant | null };

// Petite version de l'image TMDB : suffisante pour la couleur dominante, et rapide à télécharger.
const tiny = (url: string) => url.replace(/\/t\/p\/[^/]+\//, "/t/p/w92/");

async function dominantColor(url: string) {
  const res = await fetch(tiny(url), { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const { dominant } = await sharp(Buffer.from(await res.arrayBuffer())).stats();
  return `#${[dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Pour une série de disques : leur couleur (calculée au besoin, au plus 24 par affichage) et la maquette choisie par le membre.
// userId : sur le profil d'un membre, ce sont ses choix à lui qui comptent.
export async function discStyles(films: { id: number; image: string | null }[], userId?: number): Promise<Map<number, DiscStyle>> {
  const ids = [...new Set(films.map((f) => f.id))].filter((id) => Number.isInteger(id));
  const out = new Map<number, DiscStyle>();
  if (!ids.length) return out;
  const u = await viewedUser(userId);
  const [colors, styles] = await Promise.all([
    db().execute(`SELECT id, disc_color FROM films WHERE id IN (${ids.join(",")})`),
    db().execute(`SELECT film_id, variant FROM disc_styles WHERE user_id = ${u} AND film_id IN (${ids.join(",")})`),
  ]);
  const color = new Map(colors.rows.map((r) => [Number(r.id), (r.disc_color as string) ?? null]));
  const variant = new Map(styles.rows.map((r) => [Number(r.film_id), String(r.variant)]));

  const missing = films.filter((f) => f.image?.includes("image.tmdb.org") && !color.get(f.id)).slice(0, 24);
  const queue = [...missing];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        const c = await dominantColor(f.image!).catch(() => null);
        if (!c) continue;
        color.set(f.id, c);
        await db().execute({ sql: "UPDATE films SET disc_color = ? WHERE id = ?", args: [c, f.id] });
      }
    }),
  );

  for (const id of ids) {
    const v = variant.get(id) ?? "";
    out.set(id, { color: color.get(id) ?? null, variant: isDiscVariant(v) ? v : null });
  }
  return out;
}

export async function setDiscStyle(filmId: number, variant: string | null) {
  const u = await uid();
  if (!variant || !isDiscVariant(variant)) {
    await db().execute({ sql: "DELETE FROM disc_styles WHERE user_id = ? AND film_id = ?", args: [u, filmId] });
    return;
  }
  await db().execute({
    sql: "INSERT INTO disc_styles (user_id, film_id, variant) VALUES (?, ?, ?) ON CONFLICT(user_id, film_id) DO UPDATE SET variant = excluded.variant",
    args: [u, filmId, variant],
  });
}
