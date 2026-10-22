/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { DiscCarousel } from "@/components/DiscCarousel";
import { FilmCard } from "@/components/FilmCard";
import { PickPoster } from "@/components/PickCard";
import { Stars } from "@/components/Stars";
import { formatShortDate } from "@/lib/format";
import { favoriteFilms, overview, recentDiary, topFilms } from "@/lib/queries";
import { picks } from "@/lib/reco";
import { activity } from "@/lib/social";
import { ActivityFeed } from "@/components/ActivityFeed";
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
  const [feed, top] = await Promise.all([activity({ limit: 3 }), topFilms()]);
  const hasTop = top.length > 0;
  const hero = recent.find((f) => f.backdrop_path);

  if (stats.watched === 0) {
    return (
      <div className="py-24 text-center">
        <h1 className="font-display text-5xl">Bienvenue sur Dreams</h1>
        <p className="mt-4 text-muted">
          Importe ton export Letterboxd : <code className="text-accent">npm run import -- chemin/vers/export.zip</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-14 pt-2 md:pt-8">
      {hero && (
        <Link href={`/film/${hero.id}`} className="group relative block overflow-hidden rounded-2xl">
          <img src={backdrop(hero.backdrop_path)!} alt="" className="aspect-[4/3] w-full object-cover transition duration-1000 group-hover:scale-[1.03] sm:aspect-[16/9] md:aspect-[21/8]" />
          {/* Dégradé toujours sombre, pour que le titre reste lisible quel que soit le thème */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white md:p-8">
            <div>
              <p className="text-sm text-white/70">{greeting()} · ton dernier film</p>
              <h1 className="mt-1.5 font-display text-4xl leading-none md:text-6xl">{hero.title_fr ?? hero.name}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/70">
                {hero.rating != null && <Stars rating={hero.rating} />}
                <span>vu le {formatShortDate(hero.watched_date)}</span>
              </p>
            </div>
          </div>
        </Link>
      )}

      {tonight.picks.length > 0 && (
        <Row title="Ce soir, sur tes plateformes" href="/conseils">
          {tonight.picks.filter((p) => !p.inWatchlist).slice(0, 14).map((p) => <PickPoster key={p.key} pick={p} />)}
        </Row>
      )}

      {watchlist.picks.length > 0 && (
        <Row title="Ta watchlist, disponible maintenant" href="/conseils?mode=watchlist">
          {watchlist.picks.slice(0, 14).map((p) => <PickPoster key={p.key} pick={p} />)}
        </Row>
      )}

      <Row title="Journal récent" href="/films">
        {recent.map((f, i) => (
          <div key={`${f.id}-${i}`} className="w-28 shrink-0 md:w-36">
            <FilmCard film={f} caption={formatShortDate(f.watched_date)} />
          </div>
        ))}
      </Row>

      {favorites.length > 0 && (
        <section>
          <div className="mb-2 flex items-end justify-between gap-4">
            <h2 className="text-xl md:text-2xl">Coups de cœur</h2>
            <Link href="/preferes" className="shrink-0 text-sm text-muted hover:text-accent">{hasTop ? "Modifier" : "Choisir mes 10 films"}</Link>
          </div>
          <DiscCarousel
            label="Mes coups de cœur"
            discs={favorites.map((f) => ({ id: f.id, href: `/film/${f.id}`, title: f.title_fr ?? f.name, year: f.year, image: backdrop(f.backdrop_path) ?? poster(f.poster_path, "w500"), director: f.director, runtime: f.runtime, rating: f.rating }))}
          />
        </section>
      )}

      {feed.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl md:text-2xl">Chez les membres</h2>
            <Link href="/activite" className="shrink-0 text-sm text-muted hover:text-accent">Tout voir</Link>
          </div>
          <ActivityFeed items={feed} compact />
        </section>
      )}

    </div>
  );
}

function Row({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl md:text-2xl">{title}</h2>
        <Link href={href} className="shrink-0 text-sm text-muted hover:text-accent">
          Tout voir
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:gap-4 md:px-8 [&>*]:snap-start">{children}</div>
    </section>
  );
}
