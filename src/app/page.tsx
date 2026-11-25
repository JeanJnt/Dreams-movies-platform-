/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Suspense } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { PickPoster } from "@/components/PickCard";
import { SpineRow } from "@/components/dreams/SpineRow";
import { HomeFavorites } from "@/components/dreams/HomeFavorites";
import { Stars } from "@/components/Stars";
import { TitleWords } from "@/components/ui/PageHeader";
import { Rail } from "@/components/ui/Rail";
import { Arrow, Section } from "@/components/ui/Section";
import { filmArticles } from "@/lib/articles";
import { ownedFilms } from "@/lib/collection";
import { formatShortDate } from "@/lib/format";
import { caseFilms } from "@/lib/case-films";
import { designsFor } from "@/lib/designs";
import { uid } from "@/lib/auth";
import { favoriteFilms, overview, recentDiary, topFilms } from "@/lib/queries";
import { picks } from "@/lib/reco";
import { activity } from "@/lib/social";
import { originalUnder } from "@/lib/titles";
import { poster } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

/*
 * L'accueil, en espaces distincts :
 *   1. « Ce soir » : quoi regarder, sur vos plateformes ;
 *   2. le journal : les dernières séances et les chiffres ;
 *   3. « À lire » : des critiques et articles sur les derniers films vus ;
 *   4. la watchlist disponible ; 5. la collection, vue par ses tranches ;
 *   6. les coups de cœur ; 7. l’activité des amis.
 * Seuls les chiffres et le journal sont attendus : chaque autre section arrive dès qu'elle est prête (Suspense),
 * sans retarder l'affichage de la page.
 */
export default async function Home() {
  const [stats, recent] = await Promise.all([overview(), recentDiary(16)]);

  if (stats.watched === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <h1 className="text-[clamp(3rem,9vw,7rem)]">
          <TitleWords text="Bienvenue sur Dreams" />
        </h1>
        <p className="mt-6 max-w-md text-[17px] text-muted">Importez votre export Letterboxd : films, notes, critiques et listes arrivent en une fois.</p>
        <Link href="/compte" className="btn btn-primary mt-8">
          Importer depuis Letterboxd
        </Link>
      </div>
    );
  }

  const fmt = (v: number) => v.toLocaleString("fr-FR");
  return (
    <div>
      <h1 className="sr-only">Dreams Movies, accueil</h1>
      <div className="mt-10 space-y-24 md:mt-16 md:space-y-32">
        <Suspense fallback={null}>
          <Tonight />
        </Suspense>

        {/* Le journal : les dernières séances, et les chiffres de l'année */}
        <Section title="Votre journal" href="/films" linkLabel="Tout le journal">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
            <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]" data-reveal data-stagger>
              {recent.slice(0, 7).map((f, i) => (
                <li key={`${f.id}-${i}`}>
                  <Link href={`/film/${f.id}`} className="group grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-center gap-4 py-3 md:grid-cols-[6.5rem_3.2rem_minmax(0,1fr)_auto] md:gap-6">
                    <span className="hidden text-[13.5px] text-muted tabular md:block">{formatShortDate(f.watched_date)}</span>
                    <span className="poster aspect-[2/3] w-full">{f.poster_path && <img src={poster(f.poster_path, "w185")!} alt="" loading="lazy" className="size-full object-cover" />}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[1.35rem] leading-tight transition-colors group-hover:text-white md:text-[1.55rem]">{f.title_fr ?? f.name}</span>
                      {originalUnder(f.title_fr ?? f.name, f.original_title) && <span className="block truncate text-[13px] text-[var(--text-2)] italic">{originalUnder(f.title_fr ?? f.name, f.original_title)}</span>}
                      <span className="mt-0.5 block truncate text-[13.5px] text-muted">
                        {[f.director, f.year].filter(Boolean).join(", ")}
                        <span className="md:hidden"> · {formatShortDate(f.watched_date)}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[14px]">
                      {f.rating != null && <Stars rating={f.rating} />}
                      {f.liked && <span className="text-heart" aria-label="coup de cœur">♥</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-8 lg:grid-cols-1">
              {[
                [fmt(stats.thisYear), `films vus en ${new Date().getFullYear()}`, "/stats"],
                [fmt(stats.watched), "films au total", "/films"],
                [fmt(stats.hours), "heures dans le noir", "/stats"],
                [fmt(stats.watchlist), "films à voir", "/watchlist"],
              ].map(([v, l, h]) => (
                <Link key={l} href={h} className="group flex flex-col-reverse">
                  <dt className="mt-1.5 flex items-center gap-1.5 text-[14px] text-muted transition-colors group-hover:text-foreground">
                    {l}
                    <Arrow className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </dt>
                  <dd className="silver-text font-display text-[clamp(2.6rem,4vw,3.6rem)] leading-none tabular">{v}</dd>
                </Link>
              ))}
            </dl>
          </div>
        </Section>

        <Suspense fallback={null}>
          <ToRead films={recent} />
        </Suspense>

        <Suspense fallback={null}>
          <WatchlistNow />
        </Suspense>

        <Suspense fallback={null}>
          <Shelf />
        </Suspense>

        <Suspense fallback={null}>
          <Favorites />
        </Suspense>

        <Suspense fallback={null}>
          <Friends />
        </Suspense>
      </div>
    </div>
  );
}

async function Tonight() {
  const tonight = await picks({ mode: "pour-toi" });
  const list = tonight.picks.filter((p) => !p.inWatchlist).slice(0, 14);
  if (!list.length) return null;
  return (
    <Section title="Ce soir, chez vous" href="/conseils" linkLabel="Toutes les recommandations">
      <Rail label="Ce soir, sur vos plateformes">
        {list.map((p) => (
          <PickPoster key={p.key} pick={p} />
        ))}
      </Rail>
    </Section>
  );
}

// « À lire » : pour les trois derniers films vus, des critiques et analyses des revues de confiance (voir lib/articles.ts)
async function ToRead({ films }: { films: Awaited<ReturnType<typeof recentDiary>> }) {
  const last = films.filter((f, i, a) => a.findIndex((x) => x.id === f.id) === i).slice(0, 3);
  const withArticles = (
    await Promise.all(last.map(async (f) => ({ film: f, articles: await filmArticles({ name: f.name, title_fr: f.title_fr, original_title: f.original_title, year: f.year, director: f.director }) })))
  ).filter((x) => x.articles.length);
  if (!withArticles.length) return null;
  return (
    <Section title="À lire">
      <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        {withArticles.map(({ film, articles }) => (
          <article key={film.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-5">
            <Link href={`/film/${film.id}`} className="poster aspect-[2/3] w-full" aria-label={film.title_fr ?? film.name}>
              {film.poster_path && <img src={poster(film.poster_path, "w185")!} alt="" loading="lazy" className="size-full object-cover" />}
            </Link>
            <div className="min-w-0">
              <Link href={`/film/${film.id}`} className="block truncate font-display text-[1.3rem] leading-tight hover:text-white">
                {film.title_fr ?? film.name}
              </Link>
              <ul className="mt-3 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {articles.map((a) => (
                  <li key={a.url}>
                    <a href={a.url} target="_blank" rel="noreferrer" className="group block py-3">
                      <span className="line-clamp-2 text-[15px] leading-snug transition-colors group-hover:text-white">{a.title}</span>
                      <span className="mt-1 block text-[13px] text-muted">
                        {a.source}
                        {a.date && ` · ${a.date.slice(0, 4)}`}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

async function WatchlistNow() {
  const watchlist = await picks({ mode: "watchlist" });
  if (!watchlist.picks.length) return null;
  return (
    <Section title="Disponible maintenant" href="/watchlist" linkLabel="Toute la watchlist">
      <Rail label="Watchlist disponible">
        {watchlist.picks.slice(0, 14).map((p) => (
          <PickPoster key={p.key} pick={p} />
        ))}
      </Rail>
    </Section>
  );
}

async function Shelf() {
  const owned = await ownedFilms();
  if (!owned.length) return null;
  const shelfDesigns = await designsFor(owned.slice(0, 40).map((o) => o.id), await uid());
  const shelf = owned.slice(0, 40).map((o) => ({ id: o.id, title: o.title_fr ?? o.name, director: o.director, runtime: o.runtime, edition: o.edition, caseType: o.caseType, color: o.color, backdrop: o.backdrop_path ?? null, poster: o.poster_path, design: shelfDesigns.get(o.id), href: `/film/${o.id}` }));
  return (
    <Section title="Sur vos étagères" href="/collection" linkLabel="Ouvrir la bibliothèque">
      <div className="no-scrollbar bleed overflow-x-auto">
        <SpineRow films={shelf} height={280} />
      </div>
    </Section>
  );
}

// les coups de cœur : « Mes 10 films » s'ils sont choisis, sinon les dix films les mieux notés parmi les aimés
async function Favorites() {
  const [top, favorites] = await Promise.all([topFilms(), favoriteFilms(16)]);
  const ring = await caseFilms((top.length ? top : favorites).slice(0, 10).map((f) => f.id), "/film");
  if (!ring.length) return null;
  return (
    <Section title="Coups de cœur" href="/preferes" linkLabel={top.length ? "Changer mes 10 films" : "Choisir mes 10 films"}>
      <HomeFavorites films={ring} />
    </Section>
  );
}

async function Friends() {
  const feed = await activity({ limit: 5 });
  if (!feed.length) return null;
  return (
    <Section title="Activité des amis" href="/activite" linkLabel="Toute l'activité">
      <ActivityFeed items={feed} compact />
    </Section>
  );
}
