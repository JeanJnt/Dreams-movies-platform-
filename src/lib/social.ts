import { requireUser, uid } from "./auth";
import { db } from "./db";

/*
 * Le côté « Letterboxd entre amis » : profils, fil d'activité, avis des membres sur un film.
 * Tout est réservé aux membres connectés. On distingue toujours :
 *   - les REVIEWS LETTERBOXD : importées, courtes (table reviews)
 *   - les CRITIQUES DREAMS : écrites sur la plateforme, avec titre et chapô (table critiques)
 * Une critique Dreams n'est visible des autres que publiée ET réglée sur « Membres ».
 */

export type Member = { id: number; name: string; username: string | null; isAdmin: boolean; createdAt: string; films: number; critiques: number; lastActivity: string | null };

export async function members(): Promise<Member[]> {
  await requireUser();
  const { rows } = await db().execute(`
    SELECT u.id, COALESCE(u.username, u.name) AS name, u.username, u.is_admin, u.created_at,
      (SELECT COUNT(*) FROM watched w WHERE w.user_id = u.id) AS films,
      (SELECT COUNT(*) FROM critiques c WHERE c.user_id = u.id AND c.status = 'published' AND c.visibility = 'membres') AS critiques,
      (SELECT MAX(d.logged_date) FROM diary d WHERE d.user_id = u.id) AS last_activity
    FROM users u ORDER BY COALESCE(u.username, u.name) COLLATE NOCASE`);
  return rows.map((r) => ({
    id: Number(r.id), name: String(r.name), username: (r.username as string) ?? null, isAdmin: Boolean(r.is_admin), createdAt: String(r.created_at),
    films: Number(r.films), critiques: Number(r.critiques), lastActivity: (r.last_activity as string) ?? null,
  }));
}

export async function memberName(id: number) {
  const { rows } = await db().execute({ sql: "SELECT COALESCE(username, name) AS name, username, name AS first_name, created_at FROM users WHERE id = ?", args: [id] });
  return rows[0] ? { name: String(rows[0].name), username: (rows[0].username as string) ?? null, firstName: String(rows[0].first_name), createdAt: String(rows[0].created_at) } : null;
}

// --- Critiques Dreams visibles ---

export type SharedCritique = {
  id: number; userId: number; author: string; filmId: number; filmTitle: string; year: number | null; poster: string | null; backdrop: string | null;
  title: string; lede: string; body: string; rating: number | null; updatedAt: string; visibility: "membres" | "prive"; mine: boolean;
};

const critiqueRow = (r: Record<string, unknown>, me: number): SharedCritique => ({
  id: Number(r.id), userId: Number(r.user_id), author: String(r.author), filmId: Number(r.film_id), filmTitle: String(r.film_title),
  year: r.year == null ? null : Number(r.year), poster: (r.poster as string) ?? null, backdrop: (r.backdrop_path as string) ?? null,
  title: String(r.title ?? ""), lede: String(r.lede ?? ""), body: String(r.body ?? ""), rating: r.rating == null ? null : Number(r.rating),
  updatedAt: String(r.updated_at), visibility: r.visibility === "prive" ? "prive" : "membres", mine: Number(r.user_id) === me,
});

// Critiques que je peux lire : les miennes (toutes) + celles des autres publiées pour les membres.
const visibleCritiques = (me: number) => `c.status = 'published' AND (c.user_id = ${me} OR c.visibility = 'membres')`;

export async function sharedCritiques(opts: { userId?: number; filmId?: number; excludeMine?: boolean; limit?: number } = {}) {
  const me = await uid();
  const where = [visibleCritiques(me)];
  const args: number[] = [];
  if (opts.userId) { where.push("c.user_id = ?"); args.push(opts.userId); }
  if (opts.filmId) { where.push("c.film_id = ?"); args.push(opts.filmId); }
  if (opts.excludeMine) where.push(`c.user_id <> ${me}`);
  const { rows } = await db().execute({
    sql: `SELECT c.*, COALESCE(u.username, u.name) AS author, COALESCE(f.title_fr, f.name) AS film_title, f.year, f.backdrop_path,
            COALESCE((SELECT up.poster FROM user_posters up WHERE up.user_id = c.user_id AND up.film_id = f.id), f.poster_path) AS poster
          FROM critiques c JOIN users u ON u.id = c.user_id JOIN films f ON f.id = c.film_id
          WHERE ${where.join(" AND ")} ORDER BY c.updated_at DESC LIMIT ${opts.limit ?? 50}`,
    args,
  });
  return rows.map((r) => critiqueRow(r, me));
}

// Une critique précise, si j'ai le droit de la lire (la mienne, même en brouillon, ou celle d'un autre partagée).
export async function readableCritique(id: number) {
  const me = await uid();
  const { rows } = await db().execute({
    sql: `SELECT c.*, COALESCE(u.username, u.name) AS author, COALESCE(f.title_fr, f.name) AS film_title, f.year, f.backdrop_path, f.directors,
            COALESCE((SELECT up.poster FROM user_posters up WHERE up.user_id = c.user_id AND up.film_id = f.id), f.poster_path) AS poster
          FROM critiques c JOIN users u ON u.id = c.user_id JOIN films f ON f.id = c.film_id
          WHERE c.id = ? AND (c.user_id = ? OR (c.status = 'published' AND c.visibility = 'membres'))`,
    args: [id, me],
  });
  const r = rows[0];
  if (!r) return null;
  return { ...critiqueRow(r, me), directors: typeof r.directors === "string" ? (JSON.parse(r.directors) as string[]) : [], status: String(r.status) };
}

// --- Ce qu'en pensent les membres (sur la fiche d'un film) ---

export async function filmCommunity(filmId: number) {
  const me = await uid();
  const { rows } = await db().execute({
    sql: `SELECT u.id, COALESCE(u.username, u.name) AS name, r.rating, (l.film_id IS NOT NULL) AS liked, w.date AS watched,
            (SELECT MAX(d.watched_date) FROM diary d WHERE d.user_id = u.id AND d.film_id = ?) AS last_seen,
            (SELECT rv.review FROM reviews rv WHERE rv.user_id = u.id AND rv.film_id = ? AND rv.source = 'letterboxd' ORDER BY rv.watched_date DESC LIMIT 1) AS lb_review
          FROM users u
          LEFT JOIN watched w ON w.user_id = u.id AND w.film_id = ?
          LEFT JOIN ratings r ON r.user_id = u.id AND r.film_id = ?
          LEFT JOIN likes l ON l.user_id = u.id AND l.film_id = ?
          WHERE u.id <> ? AND (w.film_id IS NOT NULL OR r.film_id IS NOT NULL)
          ORDER BY r.rating DESC NULLS LAST`,
    args: [filmId, filmId, filmId, filmId, filmId, me],
  });
  const people = rows.map((r) => ({
    id: Number(r.id), name: String(r.name), rating: r.rating == null ? null : Number(r.rating), liked: Boolean(r.liked),
    lastSeen: (r.last_seen as string) ?? (r.watched as string) ?? null, letterboxdReview: (r.lb_review as string) ?? null,
  }));
  const rated = people.filter((p) => p.rating != null);
  return {
    people,
    average: rated.length ? Math.round((rated.reduce((s, p) => s + p.rating!, 0) / rated.length) * 10) / 10 : null,
    critiques: await sharedCritiques({ filmId, excludeMine: true }),
  };
}

// --- Fil d'activité ---

export type Activity = {
  kind: "vu" | "critique" | "review" | "collection" | "media";
  userId: number; author: string; filmId: number; filmTitle: string; year: number | null; poster: string | null;
  date: string; rating: number | null; rewatch: boolean; liked: boolean; text: string | null; refId: number | null; extra: string | null;
};

export async function activity(opts: { userId?: number; limit?: number } = {}): Promise<Activity[]> {
  const me = await uid();
  const limit = Math.min(opts.limit ?? 40, 100);
  const who = opts.userId ? `AND x.user_id = ${Number(opts.userId)}` : "";
  // Chaque type d'événement est mis au même format, puis on trie le tout par date.
  const { rows } = await db().execute(`
    SELECT * FROM (
      SELECT 'vu' AS kind, x.user_id, x.film_id, x.logged_date AS date, x.rating, x.rewatch, NULL AS text, x.id AS ref_id, NULL AS extra
        FROM diary x WHERE 1 ${who}
      UNION ALL
      SELECT 'critique', x.user_id, x.film_id, x.updated_at, x.rating, 0, COALESCE(NULLIF(x.title, ''), x.lede), x.id, x.lede
        FROM critiques x WHERE x.status = 'published' AND (x.user_id = ${me} OR x.visibility = 'membres') ${who}
      UNION ALL
      SELECT 'review', x.user_id, x.film_id, x.date, x.rating, x.rewatch, x.review, x.id, NULL
        FROM reviews x WHERE x.source = 'letterboxd' ${who}
      UNION ALL
      SELECT 'collection', x.user_id, x.film_id, x.added_at, NULL, 0, x.edition, NULL, x.format
        FROM owned x WHERE 1 ${who}
      UNION ALL
      SELECT 'media', x.user_id, x.film_id, x.created_at, NULL, 0, x.caption, x.id, x.kind
        FROM media x WHERE (x.user_id = ${me} OR x.visibility = 'membres') ${who}
    ) a
    ORDER BY a.date DESC LIMIT ${limit}`);
  if (!rows.length) return [];

  const filmIds = [...new Set(rows.map((r) => Number(r.film_id)))];
  const userIds = [...new Set(rows.map((r) => Number(r.user_id)))];
  const [films, users, likes] = await Promise.all([
    db().execute(`SELECT f.id, COALESCE(f.title_fr, f.name) AS title, f.year, f.poster_path FROM films f WHERE f.id IN (${filmIds.join(",")})`),
    db().execute(`SELECT id, name FROM users WHERE id IN (${userIds.join(",")})`),
    db().execute(`SELECT user_id, film_id FROM likes WHERE user_id IN (${userIds.join(",")}) AND film_id IN (${filmIds.join(",")})`),
  ]);
  const film = new Map(films.rows.map((r) => [Number(r.id), r]));
  const name = new Map(users.rows.map((r) => [Number(r.id), String(r.name)]));
  const liked = new Set(likes.rows.map((r) => `${r.user_id}-${r.film_id}`));

  return rows.map((r) => {
    const f = film.get(Number(r.film_id));
    return {
      kind: r.kind as Activity["kind"], userId: Number(r.user_id), author: name.get(Number(r.user_id)) ?? "?",
      filmId: Number(r.film_id), filmTitle: String(f?.title ?? "?"), year: f?.year == null ? null : Number(f.year), poster: (f?.poster_path as string) ?? null,
      date: String(r.date), rating: r.rating == null ? null : Number(r.rating), rewatch: Boolean(r.rewatch),
      liked: liked.has(`${r.user_id}-${r.film_id}`), text: (r.text as string) ?? null, refId: r.ref_id == null ? null : Number(r.ref_id), extra: (r.extra as string) ?? null,
    };
  });
}

