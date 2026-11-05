import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DiscCarousel } from "@/components/DiscCarousel";
import { FilmCard } from "@/components/FilmCard";
import { PickPoster } from "@/components/PickCard";
import { Stars } from "@/components/Stars";
import { Projection } from "@/components/fx/Projection";
import CountUp from "@/components/reactbits/CountUp";
import { TitleWords } from "@/components/ui/PageHeader";
import { Rail } from "@/components/ui/Rail";
import { Arrow, Section } from "@/components/ui/Section";
import { discStyles } from "@/lib/disc-style";
import { formatShortDate } from "@/lib/format";
import { favoriteFilms, overview, recentDiary, topFilms } from "@/lib/queries";
import { picks } from "@/lib/reco";
import { activity } from "@/lib/social";
import { backdrop, poster } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }));
  return h < 6 ? "Une insomnie ?" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

export default async function Home() {
  const [stats, recent, favorites, tonight, watchlist] = await Promise.all([
    overview(),
    recentDiary(16),
    favoriteFilms(16),
    picks({ mode: "pour-toi" }),
    picks({ mode: "watchlist" }),
  ]);
  const favDiscs = favorites.map((f) => ({ id: f.id, href: `/film/${f.id}`, title: f.title_fr ?? f.name, year: f.year, image: backdrop(f.backdrop_path) ?? poster(f.poster_path, "w500"), director: f.director, runtime: f.runtime, rating: f.rating }));
  const [feed, top, styles] = await Promise.all([activity({ limit: 4 }), topFilms(), discStyles(favDiscs)]);
  const hasTop = top.length > 0;
  const hero = recent.find((f) => f.backdrop_path);

  if (stats.watched === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow mb-6">Première séance</p>
        <h1 className="font-display text-[clamp(3rem,9vw,7rem)] leading-[0.9]">
          <TitleWords text="Bienvenue sur Dreams" />
        </h1>
        <p className="mt-6 max-w-md text-muted">Importe ton export Letterboxd : tes films, notes, critiques et listes arrivent en une fois.</p>
        <Link href="/compte" className="btn btn-primary mt-8">
          Importer depuis Letterboxd <Arrow />
        </Link>
      </div>
    );
  }

  const tonightPicks = tonight.picks.filter((p) => !p.inWatchlist).slice(0, 14);
  const figures = [
    { value: stats.watched, label: "films vus", href: "/films" },
    { value: stats.thisYear, label: `cette année`, href: "/stats" },
    { value: stats.hours, label: "heures dans le noir", href: "/stats" },
    { value: stats.watchlist, label: "à voir", href: "/watchlist" },
  ];
  let n = 0;

  return (
    <div>
      {hero ? (
        // L'écran : le dernier film vu, projeté plein cadre (passe sous la barre de navigation sur ordinateur)
        <section className="relative ml-[calc(50%-50vw)] w-screen md:-mt-[4.25rem]">
          <Projection src={backdrop(hero.backdrop_path)!} className="h-[72svh] min-h-[28rem] md:h-[92svh] md:max-h-[60rem]" />
          {/* Fondus : vers le fond de page en bas, vers la barre de navigation en haut — lisibles quel que soit le thème */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/80 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-[88rem] px-[var(--gutter)] pb-10 md:pb-16">
              <p className="eyebrow flex items-center gap-3 !text-foreground/70">
                <span className="h-px w-8 bg-accent" aria-hidden />
                {greeting()} · ton dernier film
              </p>
              <h1 className="mt-4 max-w-5xl font-display text-[clamp(3.2rem,10vw,9rem)] leading-[0.86] text-balance">
                <TitleWords text={hero.title_fr ?? hero.name} offset={2} />
              </h1>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] text-foreground/70 uppercase">
                  {hero.rating != null && <Stars rating={hero.rating} className="text-base tracking-normal" />}
                  {hero.liked && <span className="text-heart">♥</span>}
                  <span>vu le {formatShortDate(hero.watched_date)}</span>
                  {hero.year && <span>· {hero.year}</span>}
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href={`/film/${hero.id}`} className="btn btn-primary">
                  Ouvrir la fiche <Arrow />
                </Link>
                <Link href={`/film/${hero.id}/critique`} className="btn btn-ghost glass">
                  Écrire ma critique
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="pt-10" />
      )}

      {/* Le compteur de la salle : quatre chiffres, qui défilent une fois à l'arrivée */}
      <section className="reveal relative -mt-2 grid grid-cols-2 border-y border-[var(--line)] md:mt-0 md:grid-cols-4">
        {figures.map((f, i) => (
          <Link
            key={f.label}
            href={f.href}
            className={`group px-1 py-6 transition-colors md:px-6 md:py-9 ${i % 2 ? "pl-5 md:pl-6" : ""} ${i > 0 ? "md:border-l md:border-[var(--line)]" : ""} ${i % 2 ? "border-l border-[var(--line)]" : ""} ${i > 1 ? "border-t border-[var(--line)] md:border-t-0" : ""}`}
          >
            <span className="block font-display text-[clamp(2.4rem,5vw,4rem)] leading-none tabular transition-colors group-hover:text-accent">
              <CountUp to={f.value} separator=" " duration={1.6} />
            </span>
            <span className="eyebrow mt-3 block">{f.label}</span>
          </Link>
        ))}
      </section>

      <div className="mt-16 space-y-20 md:mt-24 md:space-y-28">
        {tonightPicks.length > 0 && (
          <Section index={++n} kicker="Sur tes plateformes" title={<>Ce soir, <em>chez toi</em></>} href="/conseils">
            <Rail label="Ce soir, sur tes plateformes">
              {tonightPicks.map((p) => <PickPoster key={p.key} pick={p} />)}
            </Rail>
          </Section>
        )}

        {watchlist.picks.length > 0 && (
          <Section index={++n} kicker="Watchlist" title="Disponible maintenant" href="/conseils?mode=watchlist">
            <Rail label="Ta watchlist, disponible maintenant">
              {watchlist.picks.slice(0, 14).map((p) => <PickPoster key={p.key} pick={p} />)}
            </Rail>
          </Section>
        )}

        <Section index={++n} kicker="Journal" title="Récemment vus" href="/films">
          <Rail label="Journal récent">
            {recent.map((f, i) => (
              <div key={`${f.id}-${i}`} className="w-[8.5rem] shrink-0 md:w-44">
                <FilmCard film={f} caption={formatShortDate(f.watched_date)} />
              </div>
            ))}
          </Rail>
        </Section>

        {favorites.length > 0 && (
          <Section index={++n} kicker="Sur l'étagère" title="Coups de cœur" href="/preferes" linkLabel={hasTop ? "Modifier" : "Choisir mes 10 films"}>
            <DiscCarousel label="Mes coups de cœur" discs={favDiscs.map((d) => ({ ...d, ...styles.get(d.id) }))} />
          </Section>
        )}

        {feed.length > 0 && (
          <Section index={++n} kicker="La bande" title="Chez les membres" href="/activite">
            <ActivityFeed items={feed} compact />
          </Section>
        )}
      </div>
    </div>
  );
}
