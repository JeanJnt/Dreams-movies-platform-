/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { RefreshAlerts } from "@/components/RefreshAlerts";
import { formatLongDate } from "@/lib/format";
import { listAlerts, markAlertsSeen, type Alert } from "@/lib/alerts";
import { backdrop, poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Au cinéma" };
export const dynamic = "force-dynamic";

const KINDS: Record<Alert["kind"], { title: string; badge: string }> = {
  en_salle: { title: "À l'affiche en ce moment", badge: "En salle" },
  ressortie: { title: "Ressorties en salle", badge: "Ressortie" },
  bientot: { title: "Bientôt au cinéma", badge: "Bientôt" },
};

export default async function AlertsPage() {
  const alerts = await listAlerts();
  await markAlertsSeen(); // ouvrir la page = alertes lues

  return (
    <div className="space-y-10 pt-2 md:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Au cinéma</h1>
          <p className="mt-3 max-w-2xl text-muted">Les films de ta watchlist et tes coups de cœur qui passent en salle à Paris, maintenant ou bientôt.</p>
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
              {list.map((a) => <AlertCard key={a.tmdbId} alert={a} />)}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-muted">
        Sorties et ressorties : TMDB. Horaires des séances : Allociné. Les alertes se mettent à jour avec « Vérifier maintenant » ou <code>npm run alertes</code>.
      </p>
    </div>
  );
}

function AlertCard({ alert: a }: { alert: Alert }) {
  const bg = backdrop(a.backdrop);
  const showtimes = `https://www.allocine.fr/rechercher/?q=${encodeURIComponent(a.title)}`;
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
            <a href={showtimes} target="_blank" rel="noreferrer" className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Séances à Paris ↗</a>
            <Link href={`/agenda?film=${a.filmId}`} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">+ Agenda</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
