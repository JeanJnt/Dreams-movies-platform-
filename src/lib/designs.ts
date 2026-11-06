import { uid } from "./auth";
import { db, ensureSchema } from "./db";
import {
  designImages,
  sanitizeDesign,
  type ObjectDesign,
} from "./design-types";
import { removeImage } from "./media";

/*
 * Les designs des objets d'un film (boîtier et disque), enregistrés par membre.
 * On garde la version précédente (prev) : « Revenir à la version précédente » échange les deux.
 */
const parse = (v: unknown): ObjectDesign | null => {
  try {
    return v ? (JSON.parse(String(v)) as ObjectDesign) : null;
  } catch {
    return null;
  }
};

export async function designsFor(ids: number[], userId: number) {
  const out = new Map<number, ObjectDesign>();
  const list = [...new Set(ids.map(Number))].filter(Number.isInteger);
  if (!list.length) return out;
  await ensureSchema();
  const { rows } = await db().execute(
    `SELECT film_id, data FROM object_designs WHERE user_id = ${Number(userId)} AND film_id IN (${list.join(",")})`,
  );
  for (const r of rows) {
    const d = parse(r.data);
    if (d) out.set(Number(r.film_id), d);
  }
  return out;
}

export async function designState(filmId: number) {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: "SELECT data, prev, updated_at FROM object_designs WHERE user_id = ? AND film_id = ?",
    args: [await uid(), filmId],
  });
  const r = rows[0];
  return {
    design: parse(r?.data),
    hasPrev: Boolean(r?.prev),
    updatedAt: (r?.updated_at as string) ?? null,
  };
}

// Supprime les images envoyées qui ne servent plus ni au design actuel, ni à la version précédente
async function sweep(
  before: (ObjectDesign | null)[],
  after: (ObjectDesign | null)[],
) {
  const keep = new Set(after.flatMap(designImages));
  for (const url of new Set(before.flatMap(designImages)))
    if (!keep.has(url)) await removeImage(url).catch(() => null);
}

export async function saveDesign(filmId: number, raw: unknown) {
  await ensureSchema();
  const me = await uid();
  const design = sanitizeDesign(raw, me);
  const { rows } = await db().execute({
    sql: "SELECT data, prev FROM object_designs WHERE user_id = ? AND film_id = ?",
    args: [me, filmId],
  });
  const cur = parse(rows[0]?.data),
    prev = parse(rows[0]?.prev);
  if (JSON.stringify(cur) === JSON.stringify(design)) return design;
  await db().execute({
    sql: `INSERT INTO object_designs (user_id, film_id, data, prev, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, film_id) DO UPDATE SET prev = excluded.prev, data = excluded.data, updated_at = excluded.updated_at`,
    args: [
      me,
      filmId,
      JSON.stringify(design),
      rows[0]?.data == null ? null : String(rows[0].data),
    ],
  });
  await sweep([cur, prev], [design, cur]);
  return design;
}

// Revenir à la version précédente : la version actuelle devient la précédente (on peut revenir encore)
export async function revertDesign(filmId: number) {
  await ensureSchema();
  const me = await uid();
  const res = await db().execute({
    sql: "UPDATE object_designs SET data = prev, prev = data, updated_at = datetime('now') WHERE user_id = ? AND film_id = ? AND prev IS NOT NULL",
    args: [me, filmId],
  });
  return res.rowsAffected > 0;
}

// Réinitialiser : l'habillage d'origine (une partie ou tout), en gardant la version actuelle comme « précédente »
export async function resetDesign(
  filmId: number,
  part: "case" | "disc" | "all",
) {
  await ensureSchema();
  const me = await uid();
  const { rows } = await db().execute({
    sql: "SELECT data, prev FROM object_designs WHERE user_id = ? AND film_id = ?",
    args: [me, filmId],
  });
  const cur = parse(rows[0]?.data),
    prev = parse(rows[0]?.prev);
  if (!cur) return;
  const next: ObjectDesign =
    part === "all" ? {} : { ...cur, [part]: undefined };
  await db().execute({
    sql: "UPDATE object_designs SET prev = data, data = ?, updated_at = datetime('now') WHERE user_id = ? AND film_id = ?",
    args: [JSON.stringify(next), me, filmId],
  });
  await sweep([cur, prev], [next, cur]);
}

// Images recadrées puis abandonnées (éditeur fermé sans enregistrer) : supprimées si aucun design ne les utilise
export async function discardImages(filmId: number, urls: string[]) {
  await ensureSchema();
  const me = await uid();
  const { rows } = await db().execute({
    sql: "SELECT data, prev FROM object_designs WHERE user_id = ? AND film_id = ?",
    args: [me, filmId],
  });
  const used = new Set(
    [parse(rows[0]?.data), parse(rows[0]?.prev)].flatMap(designImages),
  );
  for (const u of urls.slice(0, 20))
    if (!used.has(u) && u.startsWith(`/media/${me}/${filmId}/`))
      await removeImage(u).catch(() => null);
}
