/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { PickPoster } from "@/components/PickCard";
import { SpineRow } from "@/components/dreams/SpineRow";
import { HomeFavorites } from "@/components/dreams/HomeFavorites";
import { HomeDiscs } from "@/components/dreams/HomeDiscs";
import { Stars } from "@/components/Stars";
import { TitleWords } from "@/components/ui/PageHeader";
import { Rail } from "@/components/ui/Rail";
import { Arrow, Section } from "@/components/ui/Section";
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

const stars = (r: number | null) => (r == null ? "Pas noté" : "★".repeat(Math.floor(r)) + (r % 1 >= 0.5 ? "½" : ""));

/*
 * L'accueil, en espaces distincts :
 *   1. la platine : les derniers films vus, en disques (3D) ;
 *   2. « Ce soir » : quoi regarder, sur vos plateformes ;
 *   3. le journal : les dernières séances et les chiffres ;
 *   4. la watchlist disponible ;
 *   5. la collection, vue par ses tranches ;
 *   6. les coups de cœur ; 7. l’activité des amis.
 */
export default async function Home() {
  const [stats, recent, favorites, tonight, watchlist, owned, feed, top] = await Promise.all([
    overview(),
    recentDiary(16),
    favoriteFilms(16),
    picks({ mode: "pour-toi" }),
    picks({ mode: "watchlist" }),
    ownedFilms(),
    activity({ limit: 5 }),
    topFilms(),
  ]);

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

  // la platine : huit derniers films différents, avec une image
  const seen = recent.filter((f, i, a) => a.findIndex((x) => x.id === f.id) === i && (f.poster_path || f.backdrop_path)).slice(0, 8);
  const cfs = new Map((await caseFilms(seen.map((f) => f.id), "/film")).map((c) => [c.id, c]));
  const discs = seen.flatMap((f) => {
    const c = cfs.get(f.id);
    if (!c) return [];
    return [
      {
        ...c,
        date: formatShortDate(f.watched_date),
        meta: [
          { label: "Réalisation", value: c.director ?? "—" },
          { label: "Année", value: String(c.year ?? "—") },
          ...(c.runtime ? [{ label: "Durée", value: `${Math.floor(c.runtime / 60)} h ${String(c.runtime % 60).padStart(2, "0")}` }] : []),
          { label: "Ma note", value: `${stars(f.rating)}${f.liked ? "  ♥" : ""}` },
        ],
      },
    ];
  });
  const tonightPicks = tonight.picks.filter((p) => !p.inWatchlist).slice(0, 14);
  const fmt = (v: number) => v.toLocaleString("fr-FR");
  // les coups de cœur : « Mes 10 films » s'ils sont choisis, sinon les dix films les mieux notés parmi les aimés
  const ringIds = (top.length ? top : favorites).slice(0, 10).map((f) => f.id);
  const ring = await caseFilms(ringIds, "/film");
  const shelfDesigns = await designsFor(owned.slice(0, 40).map((o) => o.id), await uid());
  const shelf = owned.slice(0, 40).map((o) => ({ id: o.id, title: o.title_fr ?? o.name, director: o.director, runtime: o.runtime, edition: o.edition, caseType: o.caseType, color: o.color, backdrop: o.backdrop_path ?? null, poster: o.poster_path, design: shelfDesigns.get(o.id), href: `/film/${o.id}` }));

  return (
    <div>
      <h1 className="sr-only">Dreams Movies, accueil</h1>
      {discs.length > 0 && <HomeDiscs films={discs} />}

      <div className="mt-10 space-y-24 md:mt-16 md:space-y-32">
        {tonightPicks.length > 0 && (
          <Section title="Ce soir, chez vous" kicker="Sélectionnés d'après vos notes, disponibles sur vos plateformes" href="/conseils" linkLabel="Toutes les recommandations">
            <Rail label="Ce soir, sur vos plateformes">
              {tonightPicks.map((p) => (
                <PickPoster key={p.key} pick={p} />
              ))}
            </Rail>
          </Section>
        )}

        {/* Le journal : les dernières séances, et les chiffres de l'année */}
        <Section title="Votre journal" kicker="Les dernières séances, dans l'ordre" href="/films" linkLabel="Tout le journal">
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

        {watchlist.picks.length > 0 && (
          <Section title="Disponible maintenant" kicker="Des films de votre watchlist, en streaming aujourd'hui" href="/watchlist" linkLabel="Toute la watchlist">
            <Rail label="Watchlist disponible">
              {watchlist.picks.slice(0, 14).map((p) => (
                <PickPoster key={p.key} pick={p} />
              ))}
            </Rail>
          </Section>
        )}

        {shelf.length > 0 && (
          <Section title="Sur vos étagères" kicker={`${owned.length} film${owned.length > 1 ? "s" : ""}`} href="/collection" linkLabel="Ouvrir la bibliothèque">
            <div className="no-scrollbar bleed overflow-x-auto">
              <SpineRow films={shelf} height={280} />
            </div>
          </Section>
        )}

        {ring.length > 0 && (
          <Section title="Coups de cœur" kicker={top.length ? "Mes 10 films, en DVD" : "Vos films les mieux notés, en DVD"} href="/preferes" linkLabel={top.length ? "Changer mes 10 films" : "Choisir mes 10 films"}>
            <HomeFavorites films={ring} />
          </Section>
        )}

        {feed.length > 0 && (
          <Section title="Activité des amis" kicker="Ce que vos amis ont vu, noté et écrit" href="/activite" linkLabel="Toute l'activité">
            <ActivityFeed items={feed} compact />
          </Section>
        )}
      </div>
    </div>
  );
}
