/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { AlertSettings } from "@/components/AlertSettings";
import { PushToggle } from "@/components/PushToggle";
import { alertSources } from "@/lib/alert-sources";
import { listAlerts, markAlertsSeen, nowPlaying, type Alert } from "@/lib/alerts";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLongDate, showtimeLinks } from "@/lib/format";
import { searchPci } from "@/lib/pariscine";
import { normalize } from "@/lib/titles";
import { backdrop, poster } from "@/lib/tmdb";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Au cinéma" };
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const KINDS: Record<Alert["kind"], { title: string; badge: string }> = {
  paris: { title: "À l'affiche à Paris", badge: "Paris" },
  en_salle: { title: "En salle en ce moment", badge: "En salle" },
  ressortie: { title: "Ressorties", badge: "Ressortie" },
  bientot: { title: "Bientôt au cinéma", badge: "Bientôt" },
};
const SOURCE_LABEL: Record<Alert["source"], string> = { watchlist: "Watchlist", coup_de_coeur: "Coup de cœur", prefere: "Film préféré" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const me = await requireUser();
  const isParis = /^paris$/i.test(me.city.trim());
  const [alerts, playing, sources, checked, programme] = await Promise.all([
    listAlerts(),
    nowPlaying(),
    alertSources(me.id),
    db().execute({ sql: "SELECT alerts_checked_at FROM users WHERE id = ?", args: [me.id] }),
    q && isParis ? searchPci(q) : Promise.resolve([]),
  ]);
  await markAlertsSeen(); // ouvrir la page = alertes lues
  const checkedAt = (checked.rows[0]?.alerts_checked_at as string) ?? null;

  // Recherche : on ne garde que les films dont un titre contient la recherche
  const match = (title: string) => !q || normalize(title).includes(normalize(q));
  const mine = alerts.filter((a) => match(a.title));
  const now = playing.filter((p) => match(p.title) || match(p.original));

  return (
    <div className="space-y-16">
      <header className="space-y-8">
        <PageHeader
          eyebrow={`Séances à ${me.city}`}
          number={checkedAt ? `mis à jour ${new Date(checkedAt).toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : undefined}
          title="Au cinéma"
          actions={
            <Link href="/compte#profil" className="btn btn-sm">
              Changer de ville
            </Link>
          }
        />
        <form action="/alertes" className="flex max-w-3xl gap-2">
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder={isParis ? "Ce film passe-t-il à Paris ?" : "Ce film est-il en salle ?"}
            aria-label="Chercher un film en salle"
            className="field min-w-0 flex-1 !min-h-14 !rounded-full !px-6 !text-[1.05rem]"
          />
          {q && <Link href="/alertes" className="btn btn-ghost">Effacer</Link>}
        </form>
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
          <div className="min-w-0">
            <p className="text-[15px]">Me prévenir pour</p>
            <div className="mt-2">
              <AlertSettings initial={sources} />
            </div>
          </div>
          <PushToggle />
        </div>
      </header>

      {/* Recherche dans tout le programme parisien, pas seulement mes films */}
      {q && isParis && (
        <section>
          <h2 className="mb-5 text-[2rem] leading-none">Dans le programme de Paris Ciné Info</h2>
          {programme.length ? (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {programme.map((p) => (
                <li key={`${p.title}-${p.year}`}>
                  <a href={showtimeLinks(p.title, "Paris", "FR")[0].href} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-between gap-3 py-3 transition-colors hover:text-white">
                    <span className="min-w-0">
                      <span className="block truncate">{p.title} <span className="text-muted">{p.year}</span></span>
                      {p.original && p.original !== p.title && <span className="block truncate text-xs text-muted">{p.original}</span>}
                    </span>
                    <span className="shrink-0 text-sm text-muted">
                      {p.cinemas} salle{p.cinemas > 1 ? "s" : ""}{p.retro ? " · rétrospective" : ""}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Pas à l&apos;affiche à Paris en ce moment.</p>
          )}
        </section>
      )}

      {!q && alerts.length === 0 && (
        <div className="card px-6 py-14 text-center">
          <p className="font-display text-2xl">Aucun de vos films n&apos;est en salle</p>
          <p className="mt-2 text-[15px] text-muted">Vous serez prévenu dès qu&apos;un film de votre watchlist ou un coup de cœur ressort.</p>
        </div>
      )}

      {/* Mes films à Paris : une grille d'affiches, plus légère que des cartes */}
      {mine.some((a) => a.kind === "paris") && (
        <section>
          <h2 className="mb-6 text-[2rem] leading-none md:text-[2.6rem]">
            {KINDS.paris.title} <span className="ml-2 text-[15px] text-muted tabular">{mine.filter((a) => a.kind === "paris").length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {mine.filter((a) => a.kind === "paris").map((a) => (
              <div key={a.tmdbId}>
                <Link href={`/film/${a.filmId}`} className="poster relative block aspect-[2/3]">
                  {a.poster && <img src={poster(a.poster, "w342")!} alt={a.title} loading="lazy" className="size-full object-cover" />}
                  {!a.seen && <span className="sticker absolute top-1.5 left-1.5">Nouveau</span>}
                </Link>
                <a href={showtimeLinks(a.title, me.city, me.country)[0].href} target="_blank" rel="noreferrer" className="mt-2 block text-[13.5px] leading-snug hover:text-white">
                  <span className="line-clamp-2">{a.title}</span>
                  <span className="text-muted">{a.note?.replace(" à Paris", "")}</span>
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {(["en_salle", "ressortie", "bientot"] as const).map((kind) => {
        const list = mine.filter((a) => a.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2 className="mb-6 text-[2rem] leading-none md:text-[2.6rem]">{KINDS[kind].title}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((a) => <AlertCard key={a.tmdbId} alert={a} city={me.city} country={me.country} />)}
            </div>
          </section>
        );
      })}

      {now.length > 0 && (
        <section>
          <h2 className="mb-6 text-[2rem] leading-none md:text-[2.6rem]">Tous les films à l&apos;affiche</h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0 lg:grid-cols-8">
            {now.map((p) => (
              <div key={p.tmdbId} className={`w-28 shrink-0 snap-start md:w-auto ${p.seen ? "opacity-50" : ""}`}>
                <Link href={p.filmId ? `/film/${p.filmId}` : `/tmdb/${p.tmdbId}`} className="poster relative block aspect-[2/3]">
                  {p.poster && <img src={poster(p.poster, "w342")!} alt={p.title} loading="lazy" className="size-full object-cover" />}
                  {p.wanted && <span className="sticker absolute top-1.5 left-1.5">Watchlist</span>}
                </Link>
                <a href={showtimeLinks(p.title, me.city, me.country)[0].href} target="_blank" rel="noreferrer" className="mt-2 line-clamp-2 block text-[13.5px] leading-snug hover:text-white">
                  {p.title}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-[13px] text-muted">
        Sorties en salle : TMDB.{isParis && " Programme des salles parisiennes : Paris Ciné Info."} Mise à jour automatique 4 fois par jour.
      </p>
    </div>
  );
}

// Un film surveillé qui passe en salle : un billet large, le photogramme à gauche, l'essentiel à droite
function AlertCard({ alert: a, city, country }: { alert: Alert; city: string; country: string }) {
  const bg = backdrop(a.backdrop);
  return (
    <article className="card grid overflow-hidden !p-0 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <Link href={`/film/${a.filmId}`} className="relative block aspect-[2.39/1] sm:aspect-auto" tabIndex={-1} aria-hidden>
        {bg ? <img src={bg} alt="" className="absolute inset-0 size-full object-cover" /> : a.poster && <img src={poster(a.poster, "w342")!} alt="" className="absolute inset-0 size-full object-cover" />}
        <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent_60%,rgb(11_11_12/0.9))] max-sm:bg-[linear-gradient(0deg,rgb(11_11_12/0.9),transparent_60%)]" />
      </Link>
      <div className="flex min-w-0 flex-col p-5 md:p-6">
        <p className="wide text-muted">
          {KINDS[a.kind].badge} · {SOURCE_LABEL[a.source]}
          {!a.seen && <span className="text-foreground"> · nouveau</span>}
        </p>
        <Link href={`/film/${a.filmId}`} className="mt-3 font-display text-[1.8rem] leading-tight">
          {a.title}
        </Link>
        <p className="mt-1 text-[14px] text-muted">{[a.director, a.year].filter(Boolean).join(", ")}</p>
        {a.releaseDate && (
          <p className="mt-2 text-[14px] text-[var(--text-2)]">
            {a.kind === "bientot" ? "Sortie le " : "En salle depuis le "}
            {formatLongDate(a.releaseDate)}
          </p>
        )}
        <a href={showtimeLinks(a.title, city, country)[0].href} target="_blank" rel="noreferrer" className="btn btn-sm mt-auto self-start">
          Voir les séances
        </a>
      </div>
    </article>
  );
}
