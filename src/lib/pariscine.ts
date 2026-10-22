import { db } from "./db";
import { normalize } from "./titles";

/*
 * Paris Ciné Info (avec l'autorisation du site) : le programme de toutes les salles parisiennes,
 * classiques, rétrospectives et ciné-clubs compris.
 * - un seul appel pour la liste des films à l'affiche (mis en cache 6 h)
 * - puis les horaires, seulement pour les films de la watchlist et des coups de cœur trouvés dedans,
 *   un film à la fois avec une pause, et gardés 12 h en base pour tous les membres (le site limite les requêtes)
 */

const BASE = "https://www.paris-cine.info";
const HEADERS = { "User-Agent": "Dreams (journal de cinéma privé, avec l'accord de Paris Ciné Info)" };

type PciMovie = { id: number; ti: string; o_ti: string; en_ti: string; ye: string; di: string; co: number; ret: number; lb_u: string };
type RawShowtime = { start: string; title: string; type: string; book?: string };
export type Showtime = { start: string; cinema: string; version: string; book: string | null };

class RateLimited extends Error {}
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

let cache: { at: number; movies: PciMovie[] } | null = null;

async function pciMovies(): Promise<PciMovie[]> {
  if (cache && Date.now() - cache.at < 6 * 3600_000) return cache.movies;
  const res = await fetch(`${BASE}/get_movies.php?`, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
  if (res.status === 429 || res.status === 403) throw new RateLimited();
  if (!res.ok) throw new Error(`Paris Ciné Info ${res.status}`);
  const movies = ((await res.json()) as { data: PciMovie[] }).data ?? [];
  cache = { at: Date.now(), movies };
  return movies;
}

// Horaires d'un film : depuis la base s'ils ont moins de 12 h, sinon depuis le site.
// fresh = true quand il a fallu appeler le site (on fait alors une pause avant le film suivant).
async function pciShowtimes(movId: number): Promise<{ times: Showtime[]; fresh: boolean }> {
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  const cached = await db().execute({ sql: "SELECT data FROM pci_showtimes WHERE mov_id = ? AND fetched_at > ?", args: [movId, since] });
  let raw: RawShowtime[];
  const fresh = !cached.rows[0];
  if (!fresh) {
    raw = JSON.parse(String(cached.rows[0].data));
  } else {
    const res = await fetch(`${BASE}/get_showtimes.php?mov_id=${movId}&mov_lang=false`, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
    if (res.status === 429 || res.status === 403) throw new RateLimited();
    if (!res.ok) return { times: [], fresh };
    raw = ((await res.json()) as { showtimes?: RawShowtime[] }).showtimes ?? [];
    await db().execute({
      sql: `INSERT INTO pci_showtimes (mov_id, data, fetched_at) VALUES (?, ?, ?)
            ON CONFLICT(mov_id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
      args: [movId, JSON.stringify(raw), new Date().toISOString()],
    });
  }
  const times = raw
    .map((s) => ({ start: s.start, cinema: s.title, version: s.type, book: s.book?.startsWith("https://") ? s.book : null }))
    .filter((s) => new Date(s.start).getTime() > Date.now())
    .sort((a, b) => a.start.localeCompare(b.start));
  return { times, fresh };
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

// Crée ou met à jour les alertes « à Paris » d'un membre ; renvoie le nombre de films qui passent.
// maxFresh : au plus autant d'appels au site par passage (le reste viendra au suivant, le cache se remplit).
export async function pciCheck(u: number, maxFresh = 25) {
  const [movies, mine] = await Promise.all([pciMovies(), myFilms(u)]);
  const found: { m: Mine; p: PciMovie }[] = [];
  for (const m of mine) {
    const p = movies.find((x) => sameFilm(m, x));
    if (p) found.push({ m, p });
  }

  // Horaires : un film à la fois, avec une pause après chaque appel au site. S'il demande de ralentir, on s'arrête :
  // les films restants gardent leur alerte actuelle et seront vus au prochain passage.
  const results: { m: Mine; p: PciMovie; times: Showtime[] }[] = [];
  const unchecked: number[] = [];
  let stopped = false;
  let calls = 0;
  for (const f of found) {
    if (stopped) {
      unchecked.push(f.m.tmdbId);
      continue;
    }
    try {
      const { times, fresh } = await pciShowtimes(f.p.id);
      results.push({ ...f, times });
      if (fresh) {
        if (++calls >= maxFresh) stopped = true;
        else await pause(1200);
      }
    } catch (e) {
      if (e instanceof RateLimited) stopped = true;
      unchecked.push(f.m.tmdbId);
    }
  }

  const showing = results.filter((r) => r.times.length);
  for (const { m, p, times } of showing) {
    const cinemas = [...new Set(times.map((t) => t.cinema))];
    const note = `${cinemas.slice(0, 2).join(", ")}${cinemas.length > 2 ? ` et ${cinemas.length - 2} autre(s) salle(s)` : ""}${p.ret ? " · rétrospective" : ""}`;
    await db().execute({
      sql: `INSERT INTO alerts (user_id, tmdb_id, film_id, kind, release_date, note, source, showtimes) VALUES (?, ?, ?, 'paris', ?, ?, ?, ?)
            ON CONFLICT(user_id, tmdb_id) DO UPDATE SET kind = 'paris', release_date = excluded.release_date, note = excluded.note,
              showtimes = excluded.showtimes, seen = CASE WHEN alerts.kind = 'paris' THEN alerts.seen ELSE 0 END`,
      args: [u, m.tmdbId, m.filmId, times[0].start.slice(0, 10), note, m.source, JSON.stringify({ movId: p.id, times: times.slice(0, 12) })],
    });
  }
  // Les films qui ne passent plus : on retire l'alerte (la vérification TMDB la recréera si le film est en salle ailleurs).
  const still = [...showing.map((r) => r.m.tmdbId), ...unchecked];
  await db().execute({
    sql: `DELETE FROM alerts WHERE user_id = ? AND kind = 'paris'${still.length ? ` AND tmdb_id NOT IN (${still.join(",")})` : ""}`,
    args: [u],
  });
  return showing.length;
}
