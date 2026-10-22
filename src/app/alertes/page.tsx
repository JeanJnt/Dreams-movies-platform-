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
    <div className="space-y-10 pt-2 md:pt-8">
      <header className="space-y-5">
        <div>
          <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Au cinéma</h1>
          <p className="mt-3 text-sm text-muted">
            Séances à <span className="text-foreground">{me.city}</span> · <Link href="/compte#profil" className="hover:text-accent">changer</Link>
            {checkedAt && <> · mis à jour {new Date(checkedAt).toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</>}
          </p>
        </div>
        <form action="/alertes" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder={isParis ? "Ce film passe-t-il à Paris ?" : "Ce film est-il en salle ?"}
            className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
          />
          {q && <Link href="/alertes" className="flex items-center rounded-full px-3 text-sm text-muted">Effacer</Link>}
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AlertSettings initial={sources} />
          <PushToggle />
        </div>
      </header>

      {/* Recherche dans tout le programme parisien, pas seulement mes films */}
      {q && isParis && (
        <section>
          <h2 className="mb-3 text-xl">Dans le programme de Paris Ciné Info</h2>
          {programme.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {programme.map((p) => (
                <li key={`${p.title}-${p.year}`}>
                  <a href={showtimeLinks(p.title, "Paris", "FR")[0].href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
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
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted">Aucun des films que tu surveilles n&apos;est en salle en ce moment.</div>
      )}

      {/* Mes films à Paris : une grille d'affiches, plus légère que des cartes */}
      {mine.some((a) => a.kind === "paris") && (
        <section>
          <h2 className="mb-4 text-xl md:text-2xl">
            {KINDS.paris.title} <span className="text-base text-muted">{mine.filter((a) => a.kind === "paris").length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {mine.filter((a) => a.kind === "paris").map((a) => (
              <div key={a.tmdbId}>
                <Link href={`/film/${a.filmId}`} className="relative block aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
                  {a.poster && <img src={poster(a.poster, "w342")!} alt={a.title} loading="lazy" className="size-full object-cover" />}
                  {!a.seen && <span className="absolute top-1 left-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-on-accent">Nouveau</span>}
                </Link>
                <a href={showtimeLinks(a.title, me.city, me.country)[0].href} target="_blank" rel="noreferrer" className="mt-1.5 block text-xs leading-tight hover:text-accent">
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
            <h2 className="mb-4 text-xl md:text-2xl">{KINDS[kind].title}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((a) => <AlertCard key={a.tmdbId} alert={a} city={me.city} country={me.country} />)}
            </div>
          </section>
        );
      })}

      {now.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl md:text-2xl">Tous les films à l&apos;affiche</h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0 lg:grid-cols-8">
            {now.map((p) => (
              <div key={p.tmdbId} className={`w-28 shrink-0 snap-start md:w-auto ${p.seen ? "opacity-50" : ""}`}>
                <Link href={p.filmId ? `/film/${p.filmId}` : `/tmdb/${p.tmdbId}`} className="relative block aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
                  {p.poster && <img src={poster(p.poster, "w342")!} alt={p.title} loading="lazy" className="size-full object-cover" />}
                  {p.wanted && <span className="absolute top-1 left-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-on-accent">Watchlist</span>}
                </Link>
                <a href={showtimeLinks(p.title, me.city, me.country)[0].href} target="_blank" rel="noreferrer" className="mt-1.5 line-clamp-2 block text-xs leading-tight hover:text-accent">
                  {p.title}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted">
        Sorties en salle : TMDB.{isParis && " Programme des salles parisiennes : Paris Ciné Info."} Mise à jour automatique 4 fois par jour.
      </p>
    </div>
  );
}

function AlertCard({ alert: a, city, country }: { alert: Alert; city: string; country: string }) {
  const bg = backdrop(a.backdrop);
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      {bg && <img src={bg} alt="" className="absolute inset-0 size-full object-cover opacity-15" />}
      <div className="relative flex gap-4 p-4">
        <Link href={`/film/${a.filmId}`} className="w-20 shrink-0">
          <div className="aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
            {a.poster && <img src={poster(a.poster, "w342")!} alt={a.title} className="size-full object-cover" />}
          </div>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-xs text-muted">
            {KINDS[a.kind].badge} · {SOURCE_LABEL[a.source]}
            {!a.seen && <span className="text-accent"> · nouveau</span>}
          </p>
          <Link href={`/film/${a.filmId}`} className="mt-1 text-lg leading-tight font-semibold hover:text-accent">{a.title}</Link>
          <p className="text-sm text-muted">{[a.director, a.year].filter(Boolean).join(" · ")}</p>
          {a.releaseDate && (
            <p className="mt-1 text-sm">
              {a.kind === "bientot" ? "Sortie le " : "En salle depuis le "}
              {formatLongDate(a.releaseDate)}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-3">
            {showtimeLinks(a.title, city, country).map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={l.main ? "rounded-full bg-foreground px-3 py-1.5 text-xs text-background" : "rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent"}>
                {l.label}
              </a>
            ))}
            <Link href={`/agenda?film=${a.filmId}`} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">Planifier</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
