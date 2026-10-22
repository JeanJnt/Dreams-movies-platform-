import { db } from "./db";
import { normalize } from "./titles";

/*
 * Paris Ciné Info (avec l'autorisation du site) : le programme de toutes les salles parisiennes,
 * classiques, rétrospectives et ciné-clubs compris.
 * Un seul appel récupère la liste des films à l'affiche ; on y cherche ceux de la watchlist et des coups de cœur.
 * Les horaires se consultent sur Paris Ciné Info (lien filtré sur le film). Mis à jour 4 fois par jour (vercel.json).
 */

const BASE = "https://www.paris-cine.info";
const HEADERS = { "User-Agent": "Dreams (journal de cinéma privé, avec l'accord de Paris Ciné Info)" };

type PciMovie = { id: number; ti: string; o_ti: string; en_ti: string; ye: string; co: number; ret: number; lb_u: string };

// La liste est la même pour tous les membres : gardée en mémoire 1 h pendant une même tâche.
let cache: { at: number; movies: PciMovie[] } | null = null;

async function pciMovies(): Promise<PciMovie[]> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.movies;
  const res = await fetch(`${BASE}/get_movies.php?`, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Paris Ciné Info ${res.status}`);
  const movies = ((await res.json()) as { data: PciMovie[] }).data ?? [];
  cache = { at: Date.now(), movies };
  return movies;
}

type Mine = { tmdbId: number; filmId: number; source: string; year: number | null; titles: string[]; lbSlug: string | null };

// Mes films (watchlist et coups de cœur) avec tous leurs titres, pour les retrouver dans le programme.
async function myFilms(u: number): Promise<Mine[]> {
  const { rows } = await db().execute(`
    SELECT f.tmdb_id, f.id, f.year, f.name, f.title_fr, f.original_title, f.titles, f.lb_uri, 'watchlist' AS source FROM watchlist w JOIN films f ON f.id = w.film_id WHERE w.user_id = ${u} AND f.tmdb_id IS NOT NULL
    UNION
    SELECT f.tmdb_id, f.id, f.year, f.name, f.title_fr, f.original_title, f.titles, f.lb_uri, 'coup_de_coeur' AS source FROM likes l JOIN films f ON f.id = l.film_id WHERE l.user_id = ${u} AND f.tmdb_id IS NOT NULL`);
  const seen = new Set<number>();
  return rows
    .filter((r) => !seen.has(Number(r.tmdb_id)) && seen.add(Number(r.tmdb_id)))
    .map((r) => {
      const translated = r.titles ? Object.values(JSON.parse(String(r.titles)) as Record<string, string>) : [];
      return {
        tmdbId: Number(r.tmdb_id),
        filmId: Number(r.id),
        source: String(r.source),
        year: r.year == null ? null : Number(r.year),
        titles: [...new Set([r.name, r.title_fr, r.original_title, ...translated].filter(Boolean).map((t) => normalize(String(t))))],
        lbSlug: String(r.lb_uri ?? "").match(/letterboxd\.com\/film\/([^/]+)/)?.[1] ?? null,
      };
    });
}

// Le même film : même fiche Letterboxd, ou un titre en commun et la même année (à un an près).
function sameFilm(m: Mine, p: PciMovie) {
  if (m.lbSlug && p.lb_u) return m.lbSlug === p.lb_u;
  const year = Number(p.ye);
  if (m.year && year && Math.abs(m.year - year) > 1) return false;
  return [p.ti, p.o_ti, p.en_ti].some((t) => t && m.titles.includes(normalize(t)));
}

// Crée ou met à jour les alertes « à Paris » d'un membre ; renvoie le nombre de ses films à l'affiche.
export async function pciCheck(u: number) {
  const [movies, mine] = await Promise.all([pciMovies(), myFilms(u)]);
  const found = mine.flatMap((m) => {
    const p = movies.find((x) => sameFilm(m, x));
    return p ? [{ m, p }] : [];
  });

  for (const { m, p } of found) {
    const note = `${p.co > 1 ? `Dans ${p.co} salles` : "Dans 1 salle"} à Paris${p.ret ? " · rétrospective" : ""}`;
    await db().execute({
      sql: `INSERT INTO alerts (user_id, tmdb_id, film_id, kind, release_date, note, source) VALUES (?, ?, ?, 'paris', date('now'), ?, ?)
            ON CONFLICT(user_id, tmdb_id) DO UPDATE SET kind = 'paris', note = excluded.note,
              release_date = CASE WHEN alerts.kind = 'paris' THEN alerts.release_date ELSE excluded.release_date END,
              seen = CASE WHEN alerts.kind = 'paris' THEN alerts.seen ELSE 0 END`,
      args: [u, m.tmdbId, m.filmId, note, m.source],
    });
  }
  // Les films qui ne sont plus à l'affiche : on retire l'alerte (la vérification TMDB la recréera s'il est en salle ailleurs).
  const still = found.map((f) => f.m.tmdbId);
  await db().execute({
    sql: `DELETE FROM alerts WHERE user_id = ? AND kind = 'paris'${still.length ? ` AND tmdb_id NOT IN (${still.join(",")})` : ""}`,
    args: [u],
  });
  return found.length;
}
