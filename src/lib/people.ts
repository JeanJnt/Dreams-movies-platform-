import { uid, viewedUser } from "./auth";
import { db } from "./db";
import { tmdb } from "./tmdb";

const MONTH = { next: { revalidate: 60 * 60 * 24 * 30 } };

export type Role = "director" | "actor";

// --- Mes cinéastes et acteurs les plus vus (calculé à partir de mes films) ---

export async function topPeople(role: Role, limit = 24, userId?: number) {
  const u = await viewedUser(userId);
  const column = role === "director" ? "f.directors" : "f.cast_list";
  const value = role === "director" ? "j.value" : "json_extract(j.value, '$.name')";
  // DISTINCT : TMDB liste parfois la même personne plusieurs fois pour un film (un crédit par segment).
  const { rows } = await db().execute({
    sql: `SELECT name, COUNT(*) AS seen, ROUND(AVG(rating), 2) AS avg_rating, SUM(liked) AS liked
          FROM (
            SELECT DISTINCT ${value} AS name, f.id, r.rating, (l.film_id IS NOT NULL) AS liked
            FROM watched w JOIN films f ON f.id = w.film_id, json_each(${column}) j
            LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u} LEFT JOIN likes l ON l.film_id = f.id AND l.user_id = ${u}
            WHERE w.user_id = ${u} ${role === "actor" ? "AND j.key < 6" /* seulement les rôles principaux */ : ""}
          )
          GROUP BY name HAVING seen >= 2
          ORDER BY seen DESC, avg_rating DESC LIMIT ?`,
    args: [limit],
  });
  return rows.map((r) => ({
    name: String(r.name),
    seen: Number(r.seen),
    avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
    liked: Number(r.liked),
  }));
}

// --- Trouver la personne sur TMDB à partir de son nom ---

type SearchPerson = { id: number; name: string; known_for_department: string; profile_path: string | null; popularity: number };

export async function findPerson(name: string, role?: Role): Promise<SearchPerson | null> {
  const res = await tmdb<{ results: SearchPerson[] }>("/search/person", { query: name }, 3, MONTH);
  const dept = role === "director" ? "Directing" : role === "actor" ? "Acting" : null;
  return res.results.find((p) => dept && p.known_for_department === dept) ?? res.results[0] ?? null;
}

// --- La fiche complète d'une personne ---

type Credit = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path: string | null;
  vote_count: number;
  character?: string;
  job?: string;
};

export type PersonFilm = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  role: string;
  href: string;
  seen: boolean;
  myRating: number | null;
  inWatchlist: boolean;
};

export async function personDetail(tmdbId: number) {
  const u = await uid();
  type Raw = {
    id: number;
    name: string;
    biography: string;
    birthday: string | null;
    deathday: string | null;
    place_of_birth: string | null;
    profile_path: string | null;
    known_for_department: string;
    movie_credits: { cast: Credit[]; crew: Credit[] };
    images?: { profiles: { file_path: string }[] };
  };
  const [fr, en] = await Promise.all([
    tmdb<Raw>(`/person/${tmdbId}`, { append_to_response: "movie_credits,images" }, 3, MONTH),
    tmdb<{ biography: string }>(`/person/${tmdbId}`, { language: "en-US" }, 3, MONTH),
  ]);

  // Je relie chaque film à ma base : vu ? noté ? dans ma watchlist ?
  const all = [...fr.movie_credits.crew.filter((c) => c.job === "Director"), ...fr.movie_credits.cast];
  const ids = [...new Set(all.map((c) => c.id))];
  const mine = new Map<number, { id: number; seen: boolean; rating: number | null; watchlist: boolean }>();
  if (ids.length) {
    const { rows } = await db().execute({
      sql: `SELECT f.id, f.tmdb_id, (w.film_id IS NOT NULL) AS seen, r.rating, (wl.film_id IS NOT NULL) AS watchlist
            FROM films f LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u} LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u}
            LEFT JOIN watchlist wl ON wl.film_id = f.id AND wl.user_id = ${u}
            WHERE f.tmdb_id IN (${ids.map(() => "?").join(",")})`,
      args: ids,
    });
    for (const r of rows)
      mine.set(Number(r.tmdb_id), { id: Number(r.id), seen: Boolean(r.seen), rating: r.rating == null ? null : Number(r.rating), watchlist: Boolean(r.watchlist) });
  }

  const toFilm = (c: Credit, role: string): PersonFilm => {
    const m = mine.get(c.id);
    return {
      tmdbId: c.id,
      title: c.title,
      year: c.release_date ? Number(c.release_date.slice(0, 4)) : null,
      posterPath: c.poster_path,
      role,
      href: m ? `/film/${m.id}` : `/tmdb/${c.id}`,
      seen: Boolean(m?.seen),
      myRating: m?.rating ?? null,
      inWatchlist: Boolean(m?.watchlist),
    };
  };
  const byDate = (a: PersonFilm, b: PersonFilm) => (b.year ?? 0) - (a.year ?? 0);
  // On écarte les apparitions anecdotiques (documentaires, archives) : seulement les films un minimum connus.
  const directed = fr.movie_credits.crew.filter((c) => c.job === "Director").map((c) => toFilm(c, "Réalisation")).sort(byDate);
  const acted = fr.movie_credits.cast
    .filter((c) => c.vote_count >= 20 && !/(self|lui-même|elle-même|himself|herself)/i.test(c.character ?? ""))
    .map((c) => toFilm(c, c.character || "Rôle"))
    .sort(byDate);

  const seenFilms = [...directed, ...acted].filter((f, i, arr) => f.seen && arr.findIndex((x) => x.tmdbId === f.tmdbId) === i);
  const rated = seenFilms.filter((f) => f.myRating != null);

  return {
    id: fr.id,
    name: fr.name,
    biography: fr.biography || en.biography || null,
    birthday: fr.birthday,
    deathday: fr.deathday,
    placeOfBirth: fr.place_of_birth,
    profilePath: fr.profile_path,
    department: fr.known_for_department,
    photos: (fr.images?.profiles ?? []).slice(0, 6).map((p) => p.file_path),
    directed,
    acted,
    stats: {
      seen: seenFilms.length,
      total: new Set([...directed, ...acted].map((f) => f.tmdbId)).size,
      avgRating: rated.length ? Math.round((rated.reduce((s, f) => s + f.myRating!, 0) / rated.length) * 10) / 10 : null,
    },
  };
}

export const profileUrl = (p: string | null, size: "w185" | "h632" = "w185") => (p ? `https://image.tmdb.org/t/p/${size}${p}` : null);
