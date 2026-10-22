import { db, ensureSchema } from "./db";
import { tmdb } from "./tmdb";
import { normalize, pickTranslations } from "./titles";
import { applyMovieToFilm, applyTvToFilm, fetchMovie, refreshSearchText, type Translations } from "./tmdb-film";

// Complète les films du catalogue avec les infos TMDB (affiche, synopsis, genres, réalisateur…).
// Le travail se fait par petits paquets, pour tenir dans le temps limite d'une requête en ligne.

type SearchResult = { id: number; title: string; original_title: string; release_date?: string; vote_count: number };

// Retrouve un film Letterboxd (titre anglais + année) sur TMDB. Le premier résultat n'est pas toujours le bon
// (« Dreams » 1990 → « Backstreet Dreams », « Drive » → « Drive Angry »…) : on préfère le titre exact,
// puis, à défaut, le film le plus vu parmi ceux de la bonne année.
export async function findMovie(name: string, year: number | null): Promise<number | null> {
  return (await findMovieMatch(name, year))?.id ?? null;
}

// exact : le titre correspond exactement (sinon c'est un titre seulement proche, moins sûr) ; gap : écart d'années
type Match = { id: number; exact: boolean; gap: number; votes: number };
async function findMovieMatch(name: string, year: number | null): Promise<Match | null> {
  const wanted = normalize(name);
  const gap = (r: SearchResult) => (!year ? 0 : r.release_date ? Math.abs(Number(r.release_date.slice(0, 4)) - year) : 99);
  const titles = (r: SearchResult) => [normalize(r.title), normalize(r.original_title)];
  // Le plus vu, mais une année d'écart compte beaucoup (« Homework » de Kiarostami 1989, pas celui de 1991).
  const score = (r: SearchResult) => (r.vote_count + 1) / (1 + 4 * gap(r));
  const byVotes = (a: SearchResult, b: SearchResult) => score(b) - score(a);

  // On réunit les résultats avec l'année exacte, avec l'année d'une sortie quelconque, et sans année.
  const attempts: Record<string, string>[] = year
    ? [{ query: name, primary_release_year: String(year) }, { query: name, year: String(year) }, { query: name }]
    : [{ query: name }];
  const pages = await Promise.all(attempts.map((p) => tmdb<{ results: SearchResult[] }>("/search/movie", { ...p, language: "en-US" })));
  const seen = new Set<number>();
  const results = pages.flatMap((p) => p.results).filter((r) => !seen.has(r.id) && seen.add(r.id));

  // 1. Titre exact, à 2 ans près (dates de festival, de sortie locale…) : le plus vu.
  const exact = results.filter((r) => gap(r) <= 2 && titles(r).includes(wanted)).sort(byVotes)[0];
  if (exact) return { id: exact.id, exact: true, gap: gap(exact), votes: exact.vote_count };
  // 2. Titre proche (l'un contient l'autre : « Glass Onion » → « Glass Onion: A Knives Out Mystery »), à 1 an près.
  const close = results.filter((r) => gap(r) <= 1 && titles(r).some((t) => t && (t.includes(wanted) || wanted.includes(t)))).sort(byVotes)[0];
  return close ? { id: close.id, exact: false, gap: gap(close), votes: close.vote_count } : null;
}

// Une série TMDB au titre exact, à 2 ans près de sa première diffusion ; la plus vue.
// Pour « Twin Peaks: The Return » ou « Fargo: Year 2 », on cherche aussi la série principale (« Twin Peaks »), si elle est très vue.
type TvResult = { id: number; name: string; original_name: string; first_air_date?: string; vote_count: number };
async function findTvMatch(name: string, year: number | null): Promise<Match | null> {
  const search = async (q: string) => (await tmdb<{ results: TvResult[] }>("/search/tv", { query: q, language: "en-US" })).results;
  const gap = (r: TvResult) => (!year ? 0 : r.first_air_date ? Math.abs(Number(r.first_air_date.slice(0, 4)) - year) : 99);
  const named = (r: TvResult, n: string) => [normalize(r.name), normalize(r.original_name)].includes(normalize(n));
  const best = (list: TvResult[]) => list.sort((x, y) => y.vote_count - x.vote_count)[0];
  const exact = best((await search(name)).filter((r) => gap(r) <= 2 && named(r, name)));
  if (exact) return { id: exact.id, exact: true, gap: gap(exact), votes: exact.vote_count };
  const base = name.split(":")[0].trim();
  if (base !== name && base.length > 2) {
    const main = best((await search(base)).filter((r) => named(r, base) && r.vote_count >= 200));
    if (main) return { id: main.id, exact: false, gap: 0, votes: main.vote_count };
  }
  return null;
}
export const findTv = async (name: string, year: number | null) => (await findTvMatch(name, year))?.id ?? null;

// Film ou série ? Sans film au titre exact, la série l'emporte. Si les deux ont le titre exact,
// celui dont l'année colle le mieux (le pilote « Twin Peaks » 1989 est un film ; « Fiasco » 2024, la série), puis le plus vu.
function preferTv(movie: Match | null, tv: Match | null) {
  if (!tv) return false;
  if (!movie || !movie.exact) return true;
  if (!tv.exact) return false;
  return tv.gap < movie.gap || (tv.gap === movie.gap && tv.votes > movie.votes * 2);
}

async function enrichOne(film: { id: number; name: string; year: number | null; tmdbId: number | null }) {
  // Film ajouté depuis une liste TMDB : on connaît déjà son identifiant. Sinon, on le cherche par titre et année ;
  // sans film au titre exact, on regarde si c'est une série (Letterboxd en contient).
  let tmdbId = film.tmdbId;
  if (!tmdbId) {
    const [movie, tv] = await Promise.all([findMovieMatch(film.name, film.year), findTvMatch(film.name, film.year)]);
    if (preferTv(movie, tv)) {
      await applyTvToFilm(film.id, tv!.id);
      return true;
    }
    tmdbId = movie?.id ?? null;
  }
  if (!tmdbId) {
    await db().execute({ sql: "UPDATE films SET tmdb_status = 'not_found' WHERE id = ?", args: [film.id] });
    return false;
  }
  await applyMovieToFilm(film.id, await fetchMovie(tmdbId));
  return true;
}

export async function pendingCount() {
  await ensureSchema();
  const { rows } = await db().execute("SELECT COUNT(*) AS n FROM films WHERE tmdb_status IS NULL OR tmdb_status = 'partial'");
  return Number(rows[0].n);
}

// Traite jusqu'à `limit` films en attente ; renvoie combien il en reste.
export async function enrichBatch(limit = 40, concurrency = 8) {
  await ensureSchema();
  const { rows } = await db().execute({ sql: "SELECT id, name, year, tmdb_id FROM films WHERE tmdb_status IS NULL OR tmdb_status = 'partial' ORDER BY id LIMIT ?", args: [limit] });
  const queue = rows.map((r) => ({ id: Number(r.id), name: String(r.name), year: r.year == null ? null : Number(r.year), tmdbId: r.tmdb_id == null ? null : Number(r.tmdb_id) }));
  const missing: string[] = [];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        if (!(await enrichOne(f))) missing.push(`${f.name} (${f.year ?? "?"})`);
      } catch {
        // erreur réseau ponctuelle : le film sera retenté au prochain paquet
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { done: rows.length, remaining: await pendingCount(), missing };
}

// Titres traduits des films déjà enrichis avant leur apparition (et texte de recherche) : un appel TMDB léger par film.
export async function titlesBatch(limit = 60, concurrency = 8) {
  await ensureSchema();
  const { rows } = await db().execute({
    sql: "SELECT id, tmdb_id, original_title, original_language FROM films WHERE titles IS NULL AND tmdb_id IS NOT NULL AND tmdb_status = 'ok' LIMIT ?",
    args: [limit],
  });
  const queue = [...rows];
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try {
        const t = await tmdb<Translations>(`/movie/${Number(r.tmdb_id)}/translations`);
        const titles = pickTranslations(t.translations, { language: String(r.original_language ?? ""), title: String(r.original_title ?? "") });
        await db().execute({ sql: "UPDATE films SET titles = ? WHERE id = ?", args: [JSON.stringify(titles), Number(r.id)] });
        await refreshSearchText(Number(r.id));
      } catch {
        // retenté au prochain passage
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  // Les films sans fiche TMDB ont quand même un texte de recherche (leur titre Letterboxd).
  const { rows: bare } = await db().execute("SELECT id FROM films WHERE search_text IS NULL AND (titles IS NOT NULL OR tmdb_status IN ('not_found')) LIMIT 500");
  for (const b of bare) await refreshSearchText(Number(b.id));
  const left = await db().execute("SELECT COUNT(*) AS n FROM films WHERE titles IS NULL AND tmdb_id IS NOT NULL AND tmdb_status = 'ok'");
  return { done: rows.length, remaining: Number(left.rows[0].n) };
}

// Répare les films reliés au mauvais film TMDB par l'ancienne recherche (titre Letterboxd absent de tous leurs titres).
export async function rematchSuspects(onFix?: (line: string) => void, all = false) {
  await ensureSchema();
  const { rows } = await db().execute("SELECT id, name, year, tmdb_id, title_fr, original_title, titles FROM films WHERE tmdb_status = 'ok' AND titles IS NOT NULL");
  const suspects = all ? rows : rows.filter((r) => {
    const t = JSON.parse(String(r.titles)) as Record<string, string>;
    return ![r.original_title, r.title_fr, ...Object.values(t)].some((s) => s && normalize(String(s)) === normalize(String(r.name)));
  });
  let fixed = 0;
  const queue = [...suspects];
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try {
        const id = await findMovie(String(r.name), r.year == null ? null : Number(r.year));
        if (!id || id === Number(r.tmdb_id)) continue;
        const movie = await fetchMovie(id);
        await applyMovieToFilm(Number(r.id), movie);
        fixed++;
        onFix?.(`${r.name} (${r.year}) → ${movie.originalTitle} (${movie.year})`);
      } catch {
        // on passe, il sera revu au prochain passage
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { checked: suspects.length, fixed };
}

// Répare les séries prises pour des films (ou introuvables) : pour chaque film, on regarde s'il existe une série
// au même titre, et on garde le plus vraisemblable des deux (voir preferTv).
export async function fixSeries(onFix?: (line: string) => void) {
  await ensureSchema();
  const { rows } = await db().execute(
    "SELECT id, name, year, tmdb_id, title_fr, original_title, titles, tmdb_status FROM films WHERE media_type = 'movie' AND (tmdb_status = 'not_found' OR (tmdb_status = 'ok' AND titles IS NOT NULL))",
  );
  const queue = [...rows];
  let fixed = 0;
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try {
        const year = r.year == null ? null : Number(r.year);
        const tv = await findTvMatch(String(r.name), year);
        if (!tv) continue;
        // Le film actuel : titre Letterboxd retrouvé parmi ses titres ? Si oui, on compare années et popularité.
        let movie: Match | null = null;
        if (r.tmdb_status === "ok") {
          const t = JSON.parse(String(r.titles)) as Record<string, string>;
          const exact = [r.original_title, r.title_fr, ...Object.values(t)].some((x) => x && normalize(String(x)) === normalize(String(r.name)));
          const m = await tmdb<{ release_date?: string; vote_count: number }>(`/movie/${Number(r.tmdb_id)}`);
          const gap = !year ? 0 : m.release_date ? Math.abs(Number(m.release_date.slice(0, 4)) - year) : 99;
          movie = { id: Number(r.tmdb_id), exact, gap, votes: m.vote_count };
        }
        if (!preferTv(movie, tv)) continue;
        await applyTvToFilm(Number(r.id), tv.id);
        fixed++;
        onFix?.(`${r.name} (${r.year}) → série`);
      } catch {
        // réessayé au prochain passage
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { checked: rows.length, fixed };
}
