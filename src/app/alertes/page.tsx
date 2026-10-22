/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { RefreshAlerts } from "@/components/RefreshAlerts";
import { requireUser } from "@/lib/auth";
import { formatLongDate, showtimeLinks } from "@/lib/format";
import { listAlerts, markAlertsSeen, nowPlaying, type Alert } from "@/lib/alerts";
import { backdrop, poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Au cinéma" };
export const dynamic = "force-dynamic";

const KINDS: Record<Alert["kind"], { title: string; badge: string }> = {
  en_salle: { title: "À l'affiche en ce moment", badge: "En salle" },
  ressortie: { title: "Ressorties en salle", badge: "Ressortie" },
  bientot: { title: "Bientôt au cinéma", badge: "Bientôt" },
};

export default async function AlertsPage() {
  const [alerts, playing, me] = await Promise.all([listAlerts(), nowPlaying(), requireUser()]);
  await markAlertsSeen(); // ouvrir la page = alertes lues
  const isParis = /^paris$/i.test(me.city.trim());

  return (
    <div className="space-y-10 pt-2 md:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Au cinéma</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Les films de ta watchlist et tes coups de cœur qui passent en salle, et tout ce qui est à l&apos;affiche. Séances à <b className="text-foreground">{me.city}</b>{" "}
            <Link href="/compte#profil" className="text-sm text-accent hover:underline">changer de ville</Link>
          </p>
          {isParis && (
            <a href="https://www.paris-cine.info/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm transition hover:border-accent">
              <span className="font-display text-lg">Paris Ciné Info</span>
              <span className="text-muted">Classiques et rétrospectives dans les salles parisiennes ↗</span>
            </a>
          )}
        </div>
        <RefreshAlerts />
      </div>

      {alerts.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted">Aucun de tes films n&apos;est en salle en ce moment.</div>
      )}

      {(["en_salle", "ressortie", "bientot"] as const).map((kind) => {
        const list = alerts.filter((a) => a.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2 className="mb-4 text-3xl">{KINDS[kind].title}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((a) => <AlertCard key={a.tmdbId} alert={a} city={me.city} country={me.country} />)}
            </div>
          </section>
        );
      })}

      {playing.length > 0 && (
        <section>
          <h2 className="mb-1 text-3xl">À l&apos;affiche en ce moment</h2>
          <p className="mb-4 text-sm text-muted">Les films en salle en ce moment, les plus vus d&apos;abord. Touche une affiche pour ses séances à {me.city}.</p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {playing.map((p) => (
              <div key={p.tmdbId} className={`group ${p.seen ? "opacity-50 hover:opacity-100" : ""}`}>
                <Link href={p.filmId ? `/film/${p.filmId}` : `/tmdb/${p.tmdbId}`} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2 ring-1 ring-white/5 transition group-hover:-translate-y-1 group-hover:ring-accent/60">
                    {p.poster ? <img src={poster(p.poster, "w342")!} alt={p.title} loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{p.title}</span>}
                    {p.wanted && <span className="absolute top-1 left-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-on-accent">Watchlist</span>}
                    {p.seen && <span className="absolute top-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-white">✓ vu</span>}
                  </div>
                </Link>
                <a href={showtimeLinks(p.title, me.city, me.country)[0].href} target="_blank" rel="noreferrer" className="mt-1.5 block truncate text-xs text-muted hover:text-accent" title={`Séances de ${p.title} à ${me.city}`}>
                  {p.title} <span className="text-accent">↗</span>
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted">
        Films à l&apos;affiche, sorties et ressorties : TMDB. Les horaires s&apos;ouvrent sur Google (toutes les salles de ta ville){me.country === "FR" && ", Allociné"}{isParis && " et Paris Ciné Info"}. Les alertes se mettent à jour chaque matin, ou avec « Vérifier maintenant ».
      </p>
    </div>
  );
}

function AlertCard({ alert: a, city, country }: { alert: Alert; city: string; country: string }) {
  const bg = backdrop(a.backdrop);
  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-surface">
      {bg && <img src={bg} alt="" className="absolute inset-0 size-full object-cover opacity-20" />}
      <div className="relative flex gap-4 p-4">
        <Link href={`/film/${a.filmId}`} className="w-24 shrink-0">
          <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-lg">
            {a.poster && <img src={poster(a.poster, "w342")!} alt={a.title} className="size-full object-cover" />}
          </div>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-accent px-2 py-0.5 text-on-accent">{KINDS[a.kind].badge}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">{a.source === "watchlist" ? "Watchlist" : "♥ Coup de cœur"}</span>
            {!a.seen && <span className="rounded-full bg-heart px-2 py-0.5 text-black">Nouveau</span>}
          </div>
          <Link href={`/film/${a.filmId}`} className="font-display mt-2 text-2xl leading-tight hover:text-accent">{a.title}</Link>
          <p className="text-sm text-muted">{[a.director, a.year].filter(Boolean).join(" · ")}</p>
          {a.releaseDate && (
            <p className="mt-1 text-sm">
              {a.kind === "bientot" ? "Sortie le " : "En salle depuis le "}
              <b>{formatLongDate(a.releaseDate)}</b>
            </p>
          )}
          {a.note && <p className="text-xs text-muted italic">{a.note}</p>}
          <div className="mt-auto flex flex-wrap gap-2 pt-3">
            {showtimeLinks(a.title, city, country).map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={l.main ? "rounded-full bg-foreground px-3 py-1.5 text-xs text-background" : "rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent"}>{l.label} ↗</a>
            ))}
            <Link href={`/agenda?film=${a.filmId}`} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">+ Agenda</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
