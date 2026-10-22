import { viewedUser } from "./auth";
import { db, posterSql } from "./db";

// Statistiques d'un membre : moi par défaut, ou un autre membre sur sa page de profil (lecture seule).

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function statsOverview(userId?: number) {
  const u = await viewedUser(userId);
  const { rows } = await db().execute(`SELECT
    (SELECT COUNT(*) FROM watched WHERE user_id = ${u}) AS watched,
    (SELECT COALESCE(SUM(f.runtime), 0) FROM watched w JOIN films f ON f.id = w.film_id WHERE w.user_id = ${u}) AS minutes,
    (SELECT ROUND(AVG(rating), 2) FROM ratings WHERE user_id = ${u}) AS avg_rating,
    (SELECT COUNT(DISTINCT j.value) FROM watched w JOIN films f ON f.id = w.film_id, json_each(f.countries) j WHERE w.user_id = ${u}) AS countries,
    (SELECT COUNT(DISTINCT j.value) FROM watched w JOIN films f ON f.id = w.film_id, json_each(f.directors) j WHERE w.user_id = ${u}) AS directors,
    (SELECT COUNT(*) FROM diary WHERE user_id = ${u} AND rewatch = 1) AS rewatches,
    (SELECT COUNT(*) FROM diary WHERE user_id = ${u} AND watched_date >= strftime('%Y-01-01', 'now')) AS this_year,
    (SELECT COUNT(*) FROM diary WHERE user_id = ${u} AND watched_date >= strftime('%Y-01-01', 'now', '-1 year') AND watched_date <= date('now', '-1 year')) AS last_year`);
  const r = rows[0];
  return {
    watched: num(r.watched),
    hours: Math.round(num(r.minutes) / 60),
    days: Math.round(num(r.minutes) / 60 / 24),
    avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
    countries: num(r.countries),
    directors: num(r.directors),
    rewatches: num(r.rewatches),
    thisYear: num(r.this_year),
    lastYear: num(r.last_year),
  };
}

// Films vus par mois, sur les 24 derniers mois (y compris les mois à zéro).
export async function perMonth(months = 24, userId?: number) {
  const u = await viewedUser(userId);
  const { rows } = await db().execute({
    sql: `SELECT substr(watched_date, 1, 7) AS month, COUNT(*) AS n FROM diary
          WHERE user_id = ${u} AND watched_date >= date('now', 'start of month', ?) GROUP BY month`,
    args: [`-${months - 1} months`],
  });
  const counts = new Map(rows.map((r) => [String(r.month), num(r.n)]));
  const out: { key: string; label: string; tick: string; value: number }[] = [];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (months - 1));
  for (let i = 0; i < months; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const month = d.toLocaleDateString("fr-FR", { month: "long" });
    out.push({
      key,
      label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      tick: d.getMonth() === 0 ? `’${String(d.getFullYear()).slice(2)}` : month[0].toUpperCase(),
      value: counts.get(key) ?? 0,
    });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export async function ratingDistribution(userId?: number) {
  const u = await viewedUser(userId);
  const { rows } = await db().execute(`SELECT rating, COUNT(*) AS n FROM ratings WHERE user_id = ${u} GROUP BY rating`);
  const counts = new Map(rows.map((r) => [Number(r.rating), num(r.n)]));
  return [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((r) => ({ key: String(r), label: String(r).replace(".", ","), value: counts.get(r) ?? 0 }));
}

export async function byDecade(userId?: number) {
  const u = await viewedUser(userId);
  const { rows } = await db().execute(
    `SELECT (f.year / 10) * 10 AS decade, COUNT(*) AS n, ROUND(AVG(r.rating), 2) AS avg
     FROM watched w JOIN films f ON f.id = w.film_id LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u}
     WHERE w.user_id = ${u} AND f.year IS NOT NULL GROUP BY decade ORDER BY decade`,
  );
  return rows.map((r) => ({ key: String(r.decade), label: `${String(r.decade).slice(2)}s`, value: num(r.n), avg: r.avg == null ? null : Number(r.avg) }));
}

// Classement sur une colonne JSON (genres, pays…).
export async function topJson(column: "genres" | "countries", limit = 10, userId?: number) {
  const u = await viewedUser(userId);
  const { rows } = await db().execute({
    sql: `SELECT name, COUNT(*) AS n, ROUND(AVG(rating), 2) AS avg FROM (
            SELECT DISTINCT j.value AS name, f.id, r.rating
            FROM watched w JOIN films f ON f.id = w.film_id, json_each(f.${column}) j
            LEFT JOIN ratings r ON r.film_id = f.id AND r.user_id = ${u}
            WHERE w.user_id = ${u})
          GROUP BY name ORDER BY n DESC LIMIT ?`,
    args: [limit],
  });
  return rows.map((r) => ({ key: String(r.name), label: String(r.name), value: num(r.n), avg: r.avg == null ? null : Number(r.avg) }));
}

export async function records(userId?: number) {
  const u = await viewedUser(userId);
  const pick = async (sql: string) => {
    const { rows } = await db().execute(sql);
    const r = rows[0];
    return r ? { id: num(r.id), title: String(r.title), year: r.year == null ? null : Number(r.year), value: String(r.value) } : null;
  };
  const from = `FROM watched w JOIN films f ON f.id = w.film_id WHERE w.user_id = ${u}`;
  return {
    longest: await pick(`SELECT f.id, COALESCE(f.title_fr, f.name) AS title, f.year, f.runtime AS value ${from} AND f.runtime IS NOT NULL ORDER BY f.runtime DESC LIMIT 1`),
    oldest: await pick(`SELECT f.id, COALESCE(f.title_fr, f.name) AS title, f.year, f.year AS value ${from} AND f.year IS NOT NULL ORDER BY f.year ASC LIMIT 1`),
    mostRewatched: await pick(
      `SELECT f.id, COALESCE(f.title_fr, f.name) AS title, f.year, COUNT(*) AS value FROM diary d JOIN films f ON f.id = d.film_id
       WHERE d.user_id = ${u} GROUP BY f.id HAVING value > 1 ORDER BY value DESC LIMIT 1`,
    ),
  };
}

// La frise : chaque mois avec les films vus, du plus récent au plus ancien.
export async function timeline(limitMonths = 36, userId?: number) {
  const u = await viewedUser(userId);
  const { rows } = await db().execute({
    sql: `SELECT d.film_id AS id, d.watched_date, d.rating, d.rewatch, COALESCE(f.title_fr, f.name) AS title, f.year,
            ${posterSql(u)} AS poster_path
          FROM diary d JOIN films f ON f.id = d.film_id
          WHERE d.user_id = ${u} AND d.watched_date >= date('now', 'start of month', ?)
          ORDER BY d.watched_date DESC, d.id DESC`,
    args: [`-${limitMonths - 1} months`],
  });
  const months = new Map<string, { id: number; date: string; rating: number | null; rewatch: boolean; title: string; year: number | null; poster: string | null }[]>();
  for (const r of rows) {
    const key = String(r.watched_date).slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push({
      id: num(r.id), date: String(r.watched_date), rating: r.rating == null ? null : Number(r.rating), rewatch: Boolean(r.rewatch),
      title: String(r.title), year: r.year == null ? null : Number(r.year), poster: (r.poster_path as string) ?? null,
    });
  }
  return [...months.entries()].map(([key, films]) => ({
    key,
    label: new Date(`${key}-15`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    films,
  }));
}
