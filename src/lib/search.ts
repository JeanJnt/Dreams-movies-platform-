import { currentUser } from "./auth";
import { db, ensureSchema, posterSql } from "./db";
import { titleMatchArgs, titleMatchSql } from "./queries";
import { filmTitles, normalize, TITLE_LANGS, type TitleLang } from "./titles";
import { tmdb } from "./tmdb";

// Recherche de films et de personnes, dans toutes les langues : mes films d'abord (titres originaux, français,
// anglais et traductions, sans accents), puis tout TMDB (qui connaît aussi les titres traduits).

export type FilmHit = {
  key: string;
  href: string;
  title: string; // titre original
  sub: string | null; // titre dans la langue choisie par le membre
  year: number | null;
  poster: string | null;
  overview?: string | null;
  seen: boolean;
  mine: boolean; // déjà dans Dreams
};
export type PersonHit = { id: number; name: string; photo: string | null; job: string | null; knownFor: string[] };

type TmdbMovie = { id: number; title: string; original_title: string; release_date?: string; poster_path: string | null; overview: string; popularity: number };
type TmdbPerson = { id: number; name: string; profile_path: string | null; known_for_department?: string; known_for?: { title?: string; name?: string }[] };

const JOBS: Record<string, string> = { Directing: "Réalisation", Acting: "Acteur·rice", Writing: "Scénario", Camera: "Image", Sound: "Musique", Editing: "Montage", Production: "Production" };

const tmdbLanguage = (lang: TitleLang) => {
  const l = TITLE_LANGS.find((x) => x.code === lang);
  return l ? `${l.code}-${l.region}` : "fr-FR";
};

// Pertinence : un des titres est exactement la recherche (0), commence par elle (1), la contient ailleurs (2).
// search_text sépare les titres par « | ».
const RELEVANCE = `CASE WHEN f.search_text = ? OR f.search_text LIKE ? OR f.search_text LIKE ? OR f.search_text LIKE ? THEN 0
  WHEN f.search_text LIKE ? OR f.search_text LIKE ? THEN 1 ELSE 2 END`;
const relevanceArgs = (q: string) => {
  const n = normalize(q);
  return [n, `${n} | %`, `% | ${n} | %`, `% | ${n}`, `${n}%`, `% | ${n}%`];
};

export async function searchAll(q: string, { films: filmLimit = 20, people: peopleLimit = 6 } = {}) {
  q = q.trim().slice(0, 100);
  if (!q) return { films: [] as FilmHit[], people: [] as PersonHit[] };
  await ensureSchema();
  const me = await currentUser();
  const u = me?.id ?? 0;
  const lang: TitleLang = me?.titleLang ?? "fr";

  const [local, movies, people] = await Promise.all([
    db().execute({
      sql: `SELECT f.id, f.tmdb_id, f.name, f.year, f.title_fr, f.original_title, f.titles, f.overview, ${posterSql(u)} AS poster_path,
              (w.film_id IS NOT NULL) AS seen, (wl.film_id IS NOT NULL) AS in_watchlist
            FROM films f LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u}
            LEFT JOIN watchlist wl ON wl.film_id = f.id AND wl.user_id = ${u}
            WHERE ${titleMatchSql} AND (w.film_id IS NOT NULL OR wl.film_id IS NOT NULL OR f.tmdb_status = 'ok')
            ORDER BY ${RELEVANCE}, seen DESC, in_watchlist DESC, f.year DESC LIMIT ?`,
      args: [...titleMatchArgs(q), ...relevanceArgs(q), Math.min(filmLimit, 8)],
    }),
    tmdb<{ results: TmdbMovie[] }>("/search/movie", { query: q, language: tmdbLanguage(lang) }).then((r) => r.results).catch(() => []),
    peopleLimit
      ? tmdb<{ results: TmdbPerson[] }>("/search/person", { query: q }).then((r) => r.results).catch(() => [])
      : Promise.resolve([] as TmdbPerson[]),
  ]);

  const films: FilmHit[] = local.rows.map((r) => {
    const t = filmTitles({ name: String(r.name), title_fr: r.title_fr as string | null, original_title: r.original_title as string | null, titles: r.titles as string | null }, lang);
    return {
      key: `f${r.id}`, href: `/film/${r.id}`, title: t.main, sub: t.sub, year: r.year == null ? null : Number(r.year),
      poster: (r.poster_path as string) ?? null, overview: (r.overview as string) ?? null, seen: Boolean(r.seen), mine: true,
    };
  });
  const seenTmdb = new Set(local.rows.map((r) => Number(r.tmdb_id)));

  // Les films TMDB déjà présents dans Dreams ouvrent leur fiche Dreams.
  const others = movies.filter((m) => !seenTmdb.has(m.id)).slice(0, filmLimit);
  const known = others.length
    ? await db().execute({
        sql: `SELECT f.id, f.tmdb_id, (w.film_id IS NOT NULL) AS seen FROM films f LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${u}
              WHERE f.tmdb_id IN (${others.map(() => "?").join(",")})`,
        args: others.map((m) => m.id),
      })
    : { rows: [] };
  const byTmdb = new Map(known.rows.map((r) => [Number(r.tmdb_id), { id: Number(r.id), seen: Boolean(r.seen) }]));
  for (const m of others) {
    if (films.length >= filmLimit) break;
    const local = byTmdb.get(m.id);
    const sub = lang !== "none" && m.title && m.title !== m.original_title ? m.title : null;
    films.push({
      key: `t${m.id}`, href: local ? `/film/${local.id}` : `/tmdb/${m.id}`, title: m.original_title || m.title, sub,
      year: m.release_date ? Number(m.release_date.slice(0, 4)) : null, poster: m.poster_path, overview: m.overview || null,
      seen: local?.seen ?? false, mine: Boolean(local),
    });
  }

  return {
    films,
    people: people.slice(0, peopleLimit).map((p) => ({
      id: p.id, name: p.name, photo: p.profile_path, job: p.known_for_department ? JOBS[p.known_for_department] ?? null : null,
      knownFor: (p.known_for ?? []).map((k) => k.title ?? k.name ?? "").filter(Boolean).slice(0, 2),
    })),
  };
}
