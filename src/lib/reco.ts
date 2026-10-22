import { uid } from "./auth";
import { db, ensureSchema, posterSql } from "./db";
import { tmdb } from "./tmdb";
import type { ProviderLite } from "./tmdb-film";

// --- Mes plateformes ---

export const PLATFORMS = [
  { key: "netflix", name: "Netflix", match: /netflix/i },
  { key: "prime", name: "Prime Video", match: /prime video/i },
  { key: "canal", name: "Canal+", match: /canal\+/i },
  { key: "hbo", name: "HBO Max", match: /hbo max|^max\b/i },
  { key: "disney", name: "Disney+", match: /disney/i },
  { key: "apple", name: "Apple TV+", match: /apple tv/i },
  { key: "paramount", name: "Paramount+", match: /paramount/i },
  { key: "mubi", name: "MUBI", match: /mubi/i },
] as const;

const DEFAULT_PLATFORMS = ["netflix", "prime", "canal", "hbo"];

let ready: Promise<void> | undefined;
const schema = () => (ready ??= ensureSchema());

export async function getMyPlatforms(): Promise<string[]> {
  await schema();
  const { rows } = await db().execute({ sql: "SELECT value FROM settings WHERE user_id = ? AND key = 'platforms'", args: [await uid()] });
  return rows[0] ? JSON.parse(String(rows[0].value)) : DEFAULT_PLATFORMS;
}

export async function setMyPlatforms(keys: string[]) {
  await schema();
  await db().execute({
    sql: "INSERT INTO settings (user_id, key, value) VALUES (?, 'platforms', ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
    args: [await uid(), JSON.stringify(keys)],
  });
}

// Garde les offres de mes plateformes, une seule par plateforme (« HBO Max » et « HBO Max Amazon Channel » → une).
const onMyPlatforms = (flatrate: ProviderLite[], mine: string[]) =>
  PLATFORMS.filter((p) => mine.includes(p.key))
    .map((p) => flatrate.find((f) => p.match.test(f.name)))
    .filter((f): f is ProviderLite => Boolean(f));

// --- Mon profil de goût : ma note moyenne par genre et par réalisateur ---

type Taste = { genres: Map<string, number>; directors: Map<string, number> };

async function tasteProfile(u: number): Promise<Taste> {
  const { rows } = await db().execute(
    `SELECT f.genres, f.directors, r.rating FROM ratings r JOIN films f ON f.id = r.film_id WHERE r.user_id = ${u} AND f.genres IS NOT NULL`,
  );
  const avg = rows.reduce((s, r) => s + Number(r.rating), 0) / Math.max(rows.length, 1);
  const acc = (map: Map<string, number[]>, key: string, v: number) => map.set(key, [...(map.get(key) ?? []), v]);
  const g = new Map<string, number[]>(), d = new Map<string, number[]>();
  for (const r of rows) {
    const rating = Number(r.rating);
    (JSON.parse(String(r.genres)) as string[]).forEach((x) => acc(g, x, rating));
    (JSON.parse(String(r.directors ?? "[]")) as string[]).forEach((x) => acc(d, x, rating));
  }
  // Écart à ma moyenne, lissé pour qu'un genre vu 2 fois ne pèse pas autant qu'un genre vu 200 fois.
  const delta = (m: Map<string, number[]>, minCount: number) =>
    new Map([...m].filter(([, v]) => v.length >= minCount).map(([k, v]) => [k, ((v.reduce((s, x) => s + x, 0) - avg * v.length) / (v.length + 3))]));
  return { genres: delta(g, 3), directors: delta(d, 2) };
}

// Pourcentage « ça devrait te plaire », d'après les genres et le réalisateur du film.
function match(taste: Taste, genres: string[], directors: string[], boost = 0) {
  const gs = genres.map((x) => taste.genres.get(x) ?? 0);
  const g = gs.length ? gs.reduce((s, x) => s + x, 0) / gs.length : 0;
  const d = Math.max(0, ...directors.map((x) => taste.directors.get(x) ?? 0));
  return Math.round(Math.min(99, Math.max(30, 70 + g * 40 + d * 30 + boost)));
}

// --- Les conseils ---

export type Pick = {
  key: string;
  href: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  runtime: number | null;
  genres: string[];
  directors: string[];
  platforms: ProviderLite[];
  reasons: string[];
  match: number;
  inWatchlist: boolean;
};

export type PickFilters = {
  mode?: string; // "pour-toi" | "watchlist" | "similaire"
  genre?: string;
  duree?: string; // durée max en minutes
  decennie?: string;
  partout?: string; // "1" = ne pas limiter à mes plateformes
  from?: string; // film de départ pour le mode « similaire »
};

function applyFilters(picks: Pick[], f: PickFilters, mine: string[]) {
  return picks
    .map((p) => ({ ...p, platforms: f.partout === "1" ? p.platforms : onMyPlatforms(p.platforms, mine) }))
    .filter((p) => f.partout === "1" || p.platforms.length > 0)
    .filter((p) => !f.genre || p.genres.includes(f.genre))
    .filter((p) => !f.duree || (p.runtime != null && p.runtime <= Number(f.duree)))
    .filter((p) => !f.decennie || (p.year != null && Math.floor(p.year / 10) * 10 === Number(f.decennie)));
}

const parse = <T>(v: unknown, fallback: T): T => (typeof v === "string" ? JSON.parse(v) : fallback);

export async function picks(f: PickFilters): Promise<{ picks: Pick[]; fromTitle?: string; empty?: "reco" }> {
  await schema();
  const u = await uid();
  const [mine, taste] = await Promise.all([getMyPlatforms(), tasteProfile(u)]);
  const wl = await db().execute(`SELECT f.tmdb_id FROM watchlist w JOIN films f ON f.id = w.film_id WHERE w.user_id = ${u} AND f.tmdb_id IS NOT NULL`);
  const watchlistIds = new Set(wl.rows.map((r) => Number(r.tmdb_id)));

  if (f.mode === "watchlist") {
    const { rows } = await db().execute(
      `SELECT f.id, f.tmdb_id, COALESCE(f.title_fr, f.name) AS title, f.year, ${posterSql(u)} AS poster_path, f.runtime, f.genres, f.directors,
         p.flatrate, rc.score
       FROM watchlist w JOIN films f ON f.id = w.film_id
       LEFT JOIN providers p ON p.tmdb_id = f.tmdb_id LEFT JOIN reco rc ON rc.tmdb_id = f.tmdb_id AND rc.user_id = ${u}
       WHERE w.user_id = ${u}`,
    );
    const all = rows.map((r) => {
      const genres = parse<string[]>(r.genres, []), directors = parse<string[]>(r.directors, []);
      return {
        key: `f${r.id}`, href: `/film/${r.id}`, title: String(r.title), year: r.year == null ? null : Number(r.year),
        posterPath: (r.poster_path as string) ?? null, runtime: r.runtime == null ? null : Number(r.runtime),
        genres, directors, platforms: parse<ProviderLite[]>(r.flatrate, []), reasons: [],
        // Bonus si le film est aussi recommandé à partir de mes favoris.
        match: match(taste, genres, directors, r.score ? Math.min(10, Number(r.score) * 2) : 0),
        inWatchlist: true,
      };
    });
    return { picks: applyFilters(all, f, mine).sort((a, b) => b.match - a.match) };
  }

  if (f.mode === "similaire" && f.from) {
    const film = await db().execute({ sql: "SELECT tmdb_id, COALESCE(title_fr, name) AS title FROM films WHERE id = ?", args: [Number(f.from)] });
    const tmdbId = film.rows[0]?.tmdb_id;
    if (!tmdbId) return { picks: [] };
    const seen = await seenTmdbIds(u);
    const recos = await tmdb<{ results: { id: number }[] }>(`/movie/${tmdbId}/recommendations`, {}, 3, { next: { revalidate: 86400 } });
    const details = await Promise.all(
      recos.results.filter((r) => !seen.has(r.id)).slice(0, 20).map((r) => movieLite(r.id)),
    );
    const all = details.map((m) => ({
      key: `t${m.id}`, href: `/tmdb/${m.id}`, title: m.title, year: m.year, posterPath: m.posterPath, runtime: m.runtime,
      genres: m.genres, directors: m.directors, platforms: m.flatrate, reasons: [String(film.rows[0].title)],
      match: match(taste, m.genres, m.directors, 5), inWatchlist: watchlistIds.has(m.id),
    }));
    return { picks: applyFilters(all, f, mine), fromTitle: String(film.rows[0].title) };
  }

  const { rows } = await db().execute(
    `SELECT rc.*, p.flatrate FROM reco rc LEFT JOIN providers p ON p.tmdb_id = rc.tmdb_id WHERE rc.user_id = ${u} ORDER BY rc.score DESC`,
  );
  if (!rows.length) return { picks: [], empty: "reco" };

  // Les recos TMDB sont bruitées : on écarte les films peu vus ou mal notés, et on favorise les mieux notés.
  const ranked = rows
    .filter((r) => Number(r.vote_count) >= 80 && Number(r.vote_average) >= 6.4 && Number(r.runtime) >= 60)
    .map((r) => {
      const quality = Math.min(1.3, Math.max(0.2, (Number(r.vote_average) - 5.8) / 2));
      return { r, rank: Number(r.score) * quality };
    })
    .sort((a, b) => b.rank - a.rank);
  const maxRank = ranked[0]?.rank ?? 1;

  const all = ranked.map(({ r, rank }) => {
    const genres = parse<string[]>(r.genres, []), directors = parse<string[]>(r.directors, []);
    return {
      key: `t${r.tmdb_id}`, href: `/tmdb/${r.tmdb_id}`, title: String(r.title), year: r.year == null ? null : Number(r.year),
      posterPath: (r.poster_path as string) ?? null, runtime: r.runtime == null ? null : Number(r.runtime),
      genres, directors, platforms: parse<ProviderLite[]>(r.flatrate, []), reasons: parse<string[]>(r.reasons, []),
      match: match(taste, genres, directors, (rank / maxRank) * 15),
      inWatchlist: watchlistIds.has(Number(r.tmdb_id)),
      order: (rank / maxRank) * 40 + match(taste, genres, directors),
    };
  });
  // Classement final : moitié « recommandé par mes favoris », moitié « colle à mon profil de goût ».
  all.sort((a, b) => b.order - a.order);
  return { picks: applyFilters(all, f, mine) };
}

async function seenTmdbIds(u: number) {
  const { rows } = await db().execute(`SELECT f.tmdb_id FROM watched w JOIN films f ON f.id = w.film_id WHERE w.user_id = ${u} AND f.tmdb_id IS NOT NULL`);
  return new Set(rows.map((r) => Number(r.tmdb_id)));
}

type Lite = { id: number; title: string; year: number | null; posterPath: string | null; runtime: number | null; genres: string[]; directors: string[]; flatrate: ProviderLite[] };

async function movieLite(id: number): Promise<Lite> {
  const d = await tmdb<{
    title: string; release_date?: string; poster_path: string | null; runtime: number | null; genres: { name: string }[];
    credits: { crew: { name: string; job: string }[] };
    "watch/providers"?: { results?: { FR?: { flatrate?: { provider_name: string; logo_path: string }[] } } };
  }>(`/movie/${id}`, { append_to_response: "credits,watch/providers" }, 3, { next: { revalidate: 86400 } });
  return {
    id, title: d.title, year: d.release_date ? Number(d.release_date.slice(0, 4)) : null, posterPath: d.poster_path,
    runtime: d.runtime || null, genres: d.genres.map((g) => g.name),
    directors: [...new Set(d.credits.crew.filter((c) => c.job === "Director").map((c) => c.name))],
    flatrate: (d["watch/providers"]?.results?.FR?.flatrate ?? []).map((p) => ({ name: p.provider_name, logo: p.logo_path })),
  };
}

export const GENRES = [
  "Action", "Animation", "Aventure", "Comédie", "Crime", "Documentaire", "Drame", "Familial", "Fantastique",
  "Guerre", "Histoire", "Horreur", "Musique", "Mystère", "Romance", "Science-Fiction", "Thriller", "Western",
];
