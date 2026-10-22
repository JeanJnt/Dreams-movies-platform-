import { randomBytes } from "node:crypto";
import { uid } from "./auth";
import { db, ensureSchema, posterSql } from "./db";

// Les listes créées dans Dreams (à côté des listes importées de Letterboxd et des listes de référence).
// Visibilité : 'membres' (tous les membres la voient) ou 'prive'. Un lien secret permet de la montrer à n'importe qui.

export type UserList = {
  id: number;
  userId: number;
  author: string;
  name: string;
  description: string | null;
  visibility: "membres" | "prive";
  shareToken: string | null;
  count: number;
  posters: string[];
  updatedAt: string;
};

const toList = (r: Record<string, unknown>): UserList => ({
  id: Number(r.id),
  userId: Number(r.user_id),
  author: String(r.author ?? ""),
  name: String(r.name),
  description: (r.description as string) ?? null,
  visibility: r.visibility === "prive" ? "prive" : "membres",
  shareToken: (r.share_token as string) ?? null,
  count: Number(r.count ?? 0),
  posters: typeof r.posters === "string" ? (JSON.parse(r.posters) as (string | null)[]).filter((p): p is string => Boolean(p)) : [],
  updatedAt: String(r.updated_at),
});

const listSql = (u: number) => `
  SELECT l.*, COALESCE(us.username, us.name) AS author,
    (SELECT COUNT(*) FROM user_list_items i WHERE i.list_id = l.id) AS count,
    (SELECT json_group_array(p) FROM (SELECT ${posterSql(u)} AS p FROM user_list_items i JOIN films f ON f.id = i.film_id
       WHERE i.list_id = l.id ORDER BY i.position LIMIT 4)) AS posters
  FROM user_lists l JOIN users us ON us.id = l.user_id`;

// Mes listes, et celles que les autres membres ont rendues visibles.
export async function visibleLists() {
  await ensureSchema();
  const u = await uid();
  const { rows } = await db().execute(`${listSql(u)} WHERE l.user_id = ${u} OR l.visibility = 'membres' ORDER BY l.updated_at DESC`);
  const lists = rows.map(toList);
  return { mine: lists.filter((l) => l.userId === u), others: lists.filter((l) => l.userId !== u) };
}

// Une liste : par son numéro (si elle est à moi ou visible des membres) ou par son lien secret (sans compte).
export async function userListDetail(where: { id: number } | { token: string }) {
  await ensureSchema();
  const viewer = "id" in where ? await uid() : 0;
  const cond = "id" in where ? `l.id = ? AND (l.user_id = ${viewer} OR l.visibility = 'membres')` : "l.share_token = ?";
  const { rows } = await db().execute({ sql: `${listSql(viewer)} WHERE ${cond}`, args: ["id" in where ? where.id : where.token] });
  if (!rows[0]) return null;
  const list = toList(rows[0]);
  const films = await db().execute({
    sql: `SELECT f.id, f.name, f.title_fr, f.year, ${posterSql(viewer)} AS poster_path, f.backdrop_path, f.tmdb_id, f.lb_uri, f.runtime,
            json_extract(f.directors, '$[0]') AS director, i.position
          FROM user_list_items i JOIN films f ON f.id = i.film_id WHERE i.list_id = ? ORDER BY i.position`,
    args: [list.id],
  });
  return {
    ...list,
    isMine: list.userId === viewer,
    films: films.rows.map((r) => ({
      id: Number(r.id), name: String(r.name), title_fr: (r.title_fr as string) ?? null, year: r.year == null ? null : Number(r.year),
      poster_path: (r.poster_path as string) ?? null, backdrop_path: (r.backdrop_path as string) ?? null,
      tmdb_id: r.tmdb_id == null ? null : Number(r.tmdb_id), lb_uri: (r.lb_uri as string) ?? null,
      runtime: r.runtime == null ? null : Number(r.runtime), director: (r.director as string) ?? null,
      rating: null, liked: false,
    })),
  };
}

// Crée ou modifie une de mes listes, avec ses films dans l'ordre. Renvoie son numéro.
export async function saveUserList(input: { id?: number; name: string; description: string | null; visibility: string; filmIds: number[] }) {
  await ensureSchema();
  const u = await uid();
  const visibility = input.visibility === "prive" ? "prive" : "membres";
  let id = input.id;
  if (id) {
    const res = await db().execute({
      sql: "UPDATE user_lists SET name = ?, description = ?, visibility = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      args: [input.name, input.description, visibility, id, u],
    });
    if (!res.rowsAffected) throw new Error("Liste introuvable.");
  } else {
    const res = await db().execute({
      sql: "INSERT INTO user_lists (user_id, name, description, visibility) VALUES (?, ?, ?, ?)",
      args: [u, input.name, input.description, visibility],
    });
    id = Number(res.lastInsertRowid);
  }
  await db().batch(
    [
      { sql: "DELETE FROM user_list_items WHERE list_id = ? AND user_id = ?", args: [id, u] },
      ...input.filmIds.map((filmId, i) => ({ sql: "INSERT OR IGNORE INTO user_list_items (user_id, list_id, film_id, position) VALUES (?, ?, ?, ?)", args: [u, id!, filmId, i + 1] })),
    ],
    "write",
  );
  return id;
}

export async function deleteUserList(id: number) {
  const u = await uid();
  await db().batch(
    [
      { sql: "DELETE FROM user_list_items WHERE list_id = ? AND user_id = ?", args: [id, u] },
      { sql: "DELETE FROM user_lists WHERE id = ? AND user_id = ?", args: [id, u] },
    ],
    "write",
  );
}

// Crée (ou retire) le lien de partage secret d'une de mes listes.
export async function setListShare(id: number, on: boolean) {
  const u = await uid();
  const token = on ? randomBytes(12).toString("base64url") : null;
  await db().execute({ sql: "UPDATE user_lists SET share_token = ? WHERE id = ? AND user_id = ?", args: [token, id, u] });
  return token;
}
