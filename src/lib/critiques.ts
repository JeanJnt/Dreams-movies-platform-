import { db, ensureSchema } from "./db";

export type Critique = {
  id: number;
  filmId: number;
  title: string;
  lede: string;
  body: string;
  rating: number | null;
  status: "draft" | "published";
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
let ready: Promise<void> | undefined;
const schema = () => (ready ??= ensureSchema());

function toCritique(r: Record<string, unknown>): Critique {
  return {
    id: Number(r.id),
    filmId: Number(r.film_id),
    title: String(r.title ?? ""),
    lede: String(r.lede ?? ""),
    body: String(r.body ?? ""),
    rating: r.rating == null ? null : Number(r.rating),
    status: r.status === "published" ? "published" : "draft",
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

const WITH_FILM = `SELECT c.*, f.name, f.title_fr, f.year, COALESCE(f.custom_poster, f.poster_path) AS poster_path, f.backdrop_path, f.directors
  FROM critiques c JOIN films f ON f.id = c.film_id`;

export async function critiqueForFilm(filmId: number) {
  await schema();
  const { rows } = await db().execute({
    sql: "SELECT * FROM critiques WHERE film_id = ? ORDER BY updated_at DESC LIMIT 1",
    args: [filmId],
  });
  return rows[0] ? toCritique(rows[0]) : null;
}

export async function getCritique(id: number) {
  await schema();
  const { rows } = await db().execute({ sql: `${WITH_FILM} WHERE c.id = ?`, args: [id] });
  return rows[0] ? withFilm(rows[0]) : null;
}

export async function allCritiques() {
  await schema();
  const { rows } = await db().execute(`${WITH_FILM} ORDER BY c.status = 'draft' DESC, c.updated_at DESC`);
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
}) {
  await schema();
  const args = [input.title.trim(), input.lede.trim(), input.body, input.rating, input.status];
  if (input.id) {
    await db().execute({
      sql: `UPDATE critiques SET title = ?, lede = ?, body = ?, rating = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [...args, input.id],
    });
    return input.id;
  }
  const res = await db().execute({
    sql: "INSERT INTO critiques (title, lede, body, rating, status, film_id) VALUES (?, ?, ?, ?, ?, ?)",
    args: [...args, input.filmId],
  });
  return Number(res.lastInsertRowid);
}

export async function deleteCritique(id: number) {
  await schema();
  await db().execute({ sql: "DELETE FROM critiques WHERE id = ?", args: [id] });
}

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export const readingTime = (text: string) => Math.max(1, Math.round(wordCount(text) / 220));
