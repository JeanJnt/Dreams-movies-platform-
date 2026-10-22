import { uid } from "./auth";
import { db, ensureSchema, posterSql } from "./db";

export type Critique = {
  id: number;
  filmId: number;
  title: string;
  lede: string;
  body: string;
  rating: number | null;
  status: "draft" | "published";
  visibility: "membres" | "prive";
  createdAt: string;
  updatedAt: string;
};

export type CritiqueWithFilm = Critique & {
  filmName: string;
  filmTitleFr: string | null;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  directors: string[];
};

// La table a été ajoutée après la V1 : on s'assure qu'elle existe avant chaque accès.

const schema = () => ensureSchema(); // mémorisé dans db.ts (et réessayé en cas d'échec)

function toCritique(r: Record<string, unknown>): Critique {
  return {
    id: Number(r.id),
    filmId: Number(r.film_id),
    title: String(r.title ?? ""),
    lede: String(r.lede ?? ""),
    body: String(r.body ?? ""),
    rating: r.rating == null ? null : Number(r.rating),
    status: r.status === "published" ? "published" : "draft",
    visibility: r.visibility === "prive" ? "prive" : "membres",
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function withFilm(r: Record<string, unknown>): CritiqueWithFilm {
  return {
    ...toCritique(r),
    filmName: String(r.name),
    filmTitleFr: (r.title_fr as string) ?? null,
    year: r.year == null ? null : Number(r.year),
    posterPath: (r.poster_path as string) ?? null,
    backdropPath: (r.backdrop_path as string) ?? null,
    directors: typeof r.directors === "string" ? JSON.parse(r.directors) : [],
  };
}

// Toujours filtré par utilisateur : on ne lit jamais la critique de quelqu'un d'autre.
const withFilmSql = (u: number) => `SELECT c.*, f.name, f.title_fr, f.year, ${posterSql(u)} AS poster_path, f.backdrop_path, f.directors
  FROM critiques c JOIN films f ON f.id = c.film_id WHERE c.user_id = ${u}`;

export async function critiqueForFilm(filmId: number) {
  await schema();
  const { rows } = await db().execute({
    sql: "SELECT * FROM critiques WHERE film_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1",
    args: [filmId, await uid()],
  });
  return rows[0] ? toCritique(rows[0]) : null;
}

export async function getCritique(id: number) {
  await schema();
  const { rows } = await db().execute({ sql: `${withFilmSql(await uid())} AND c.id = ?`, args: [id] });
  return rows[0] ? withFilm(rows[0]) : null;
}

export async function allCritiques() {
  await schema();
  const { rows } = await db().execute(`${withFilmSql(await uid())} ORDER BY c.status = 'draft' DESC, c.updated_at DESC`);
  return rows.map(withFilm);
}

export async function saveCritique(input: {
  id?: number;
  filmId: number;
  title: string;
  lede: string;
  body: string;
  rating: number | null;
  status: "draft" | "published";
  visibility: "membres" | "prive";
}) {
  await schema();
  const u = await uid();
  const args = [input.title.trim(), input.lede.trim(), input.body, input.rating, input.status, input.visibility];
  if (input.id) {
    const res = await db().execute({
      sql: `UPDATE critiques SET title = ?, lede = ?, body = ?, rating = ?, status = ?, visibility = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      args: [...args, input.id, u],
    });
    if (!res.rowsAffected) throw new Error("Critique introuvable");
    return input.id;
  }
  const res = await db().execute({
    sql: "INSERT INTO critiques (title, lede, body, rating, status, visibility, film_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [...args, input.filmId, u],
  });
  return Number(res.lastInsertRowid);
}

export async function deleteCritique(id: number) {
  await schema();
  await db().execute({ sql: "DELETE FROM critiques WHERE id = ? AND user_id = ?", args: [id, await uid()] });
}

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export const readingTime = (text: string) => Math.max(1, Math.round(wordCount(text) / 220));
