import { db } from "./db";

// Les films qu'un membre veut surveiller pour les alertes cinéma (réglable sur la page « Au cinéma »).
export const ALERT_SOURCES = [
  { key: "watchlist", label: "Watchlist", source: "watchlist", table: "watchlist" },
  { key: "likes", label: "Coups de cœur Letterboxd", source: "coup_de_coeur", table: "likes" },
  { key: "top", label: "Films préférés", source: "prefere", table: "top_films" },
] as const;
export type AlertSourceKey = (typeof ALERT_SOURCES)[number]["key"];

export async function alertSources(u: number): Promise<AlertSourceKey[]> {
  const { rows } = await db().execute({ sql: "SELECT alert_sources FROM users WHERE id = ?", args: [u] });
  const raw = String(rows[0]?.alert_sources ?? "watchlist,likes,top").split(",");
  return ALERT_SOURCES.filter((s) => raw.includes(s.key)).map((s) => s.key);
}

// Requête SQL des films surveillés : « cols » sont les colonnes de films (préfixe f.) à renvoyer, plus « source ».
// u est toujours un entier issu de la session.
export async function watchedForAlertsSql(u: number, cols: string) {
  const keys = await alertSources(u);
  const parts = ALERT_SOURCES.filter((s) => keys.includes(s.key)).map(
    (s) => `SELECT ${cols}, '${s.source}' AS source FROM ${s.table} x JOIN films f ON f.id = x.film_id WHERE x.user_id = ${Number(u)} AND f.tmdb_id IS NOT NULL`,
  );
  return parts.length ? parts.join(" UNION ") : null;
}
