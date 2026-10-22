import { uid, viewedUser } from "./auth";
import { db, ensureSchema, posterSql } from "./db";
import type { Film } from "./queries";

export const FORMATS = ["Blu-ray 4K", "Blu-ray", "DVD", "Numérique", "VHS"] as const;

// Les types de boîtier, pour que chaque film de ma collection ait le bon.
export const CASE_TYPES = [
  { key: "amaray", label: "Boîtier classique" },
  { key: "steelbook", label: "Steelbook" },
  { key: "digipack", label: "Digipack (carton)" },
  { key: "coffret", label: "Coffret" },
] as const;
export type CaseType = (typeof CASE_TYPES)[number]["key"];

export type OwnedItem = { format: string; caseType: CaseType; edition: string | null; cover: string | null; ean: string | null };


const schema = () => ensureSchema(); // mémorisé dans db.ts (et réessayé en cas d'échec)

const toItem = (r: Record<string, unknown>): OwnedItem => ({
  format: String(r.format),
  caseType: ((r.case_type as string) ?? "amaray") as CaseType,
  edition: (r.edition as string) ?? null,
  cover: (r.cover as string) ?? null,
  ean: (r.ean as string) ?? null,
});

export async function ownedItem(filmId: number): Promise<OwnedItem | null> {
  await schema();
  const { rows } = await db().execute({ sql: "SELECT * FROM owned WHERE film_id = ? AND user_id = ?", args: [filmId, await uid()] });
  return rows[0] ? toItem(rows[0]) : null;
}

export async function setOwned(filmId: number, item: (Partial<OwnedItem> & { format: string }) | null) {
  await schema();
  const u = await uid();
  if (!item) {
    await db().execute({ sql: "DELETE FROM owned WHERE film_id = ? AND user_id = ?", args: [filmId, u] });
    return;
  }
  await db().execute({
    sql: `INSERT INTO owned (user_id, film_id, format, case_type, edition, cover, ean) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, film_id) DO UPDATE SET format = excluded.format, case_type = excluded.case_type,
            edition = excluded.edition, cover = excluded.cover, ean = COALESCE(excluded.ean, owned.ean)`,
    args: [u, filmId, item.format, item.caseType ?? "amaray", item.edition?.trim() || null, item.cover || null, item.ean ?? null],
  });
}

export type OwnedFilm = Film & OwnedItem & { seen: boolean };

export async function ownedFilms(format?: string, userId?: number): Promise<OwnedFilm[]> {
  await schema();
  const u = await viewedUser(userId);
  const { rows } = await db().execute({
    sql: `SELECT f.id AS fid, f.name, f.year, f.title_fr, ${posterSql(u)} AS poster_path, f.backdrop_path,
            r.rating, (l.film_id IS NOT NULL) AS liked, o.format, o.case_type, o.edition, o.cover, o.ean,
            (w.film_id IS NOT NULL) AS seen, json_extract(f.directors, '$[0]') AS director, f.runtime
          FROM owned o JOIN films f ON f.id = o.film_id
          LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u} LEFT JOIN likes l ON l.film_id = f.id AND l.user_id = ${u}
          LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u}
          WHERE o.user_id = ${u} ${format ? "AND o.format = ?" : ""}
          ORDER BY f.name COLLATE NOCASE`,
    args: format ? [format] : [],
  });
  return rows.map((r) => ({
    id: Number(r.fid), name: String(r.name), year: r.year == null ? null : Number(r.year),
    title_fr: (r.title_fr as string) ?? null, poster_path: (r.poster_path as string) ?? null,
    backdrop_path: (r.backdrop_path as string) ?? null, rating: r.rating == null ? null : Number(r.rating),
    liked: Boolean(r.liked), seen: Boolean(r.seen),
    director: (r.director as string) ?? null, runtime: r.runtime == null ? null : Number(r.runtime),
    ...toItem(r),
  }));
}

export async function ownedCounts() {
  await schema();
  const { rows } = await db().execute(`SELECT format, COUNT(*) AS n FROM owned WHERE user_id = ${await uid()} GROUP BY format`);
  return Object.fromEntries(rows.map((r) => [String(r.format), Number(r.n)])) as Record<string, number>;
}
