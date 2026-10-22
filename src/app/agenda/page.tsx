/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { EventForm } from "@/components/EventForm";
import { eventsBetween, upcomingEvents, type CinemaEvent } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { db, posterSql } from "@/lib/db";
import { members } from "@/lib/social";
import { poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const pad = (n: number) => String(n).padStart(2, "0");

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mois?: string; film?: string }> }) {
  const { mois, film } = await searchParams;
  const user = await requireUser();
  const tokenRow = await db().execute({ sql: "SELECT calendar_token FROM users WHERE id = ?", args: [user.id] });
  const calendarUrl = `/agenda/ics?token=${tokenRow.rows[0]?.calendar_token ?? ""}`;
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 10);
  const [y, m] = (mois && /^\d{4}-\d{2}$/.test(mois) ? mois : today.slice(0, 7)).split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const next = new Date(y, m, 1);
  const prev = new Date(y, m - 2, 1);
  const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

  const [monthEvents, upcoming, prefill, everyone] = await Promise.all([
    eventsBetween(`${key(first)}-01`, `${key(next)}-01`),
    upcomingEvents(12),
    film ? db().execute({ sql: `SELECT f.id, COALESCE(f.title_fr, f.name) AS title, f.year, ${posterSql(user.id)} AS poster FROM films f WHERE f.id = ?`, args: [Number(film)] }) : null,
    members(),
  ]);
  const others = everyone.filter((m) => m.id !== user.id).map((m) => ({ id: m.id, name: m.name }));
  const initialFilm = prefill?.rows[0]
    ? { id: Number(prefill.rows[0].id), title: String(prefill.rows[0].title), year: prefill.rows[0].year == null ? null : Number(prefill.rows[0].year), poster: (prefill.rows[0].poster as string) ?? null }
    : null;

  // Grille du mois, semaines commençant le lundi
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const byDay = new Map<number, CinemaEvent[]>();
  for (const e of monthEvents) {
    const d = Number(e.startsAt.slice(8, 10));
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }

  return (
    <div className="space-y-8 pt-2 md:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Agenda</h1>
        <a href={calendarUrl} className="rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-accent" title="Ajoute toutes tes séances au calendrier de ton téléphone ou de ton ordinateur">
          Exporter vers mon calendrier
        </a>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-border bg-surface p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Link href={`/agenda?mois=${key(prev)}`} className="flex size-9 items-center justify-center rounded-full border border-border hover:border-accent" aria-label="Mois précédent">←</Link>
            <h2 className="text-2xl capitalize md:text-xl md:text-2xl">{first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
            <Link href={`/agenda?mois=${key(next)}`} className="flex size-9 items-center justify-center rounded-full border border-border hover:border-accent" aria-label="Mois suivant">→</Link>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const date = d ? `${key(first)}-${pad(d)}` : "";
              const events = d ? byDay.get(d) ?? [] : [];
              return (
                <div key={i} className={`relative min-h-16 overflow-hidden rounded-lg p-1 md:min-h-24 ${d ? "bg-surface-2/50" : ""} ${date === today ? "ring-2 ring-accent" : ""}`}>
                  {d && <span className={`text-xs tabular-nums ${date === today ? "font-bold text-accent" : "text-muted"}`}>{d}</span>}
                  {events.map((e) => (
                    <Link key={e.id} href={e.filmId ? `/film/${e.filmId}` : "#"} className="mt-0.5 block" title={`${e.startsAt.slice(11)} · ${e.title}${e.place ? ` · ${e.place}` : ""}`}>
                      {e.poster ? (
                        <img src={poster(e.poster, "w185")!} alt={e.title} className="aspect-[2/3] w-full rounded object-cover md:w-3/4" />
                      ) : (
                        <span className="block truncate rounded bg-accent px-1 text-[10px] text-on-accent">{e.title}</span>
                      )}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <EventForm key={initialFilm?.id ?? "new"} initialFilm={initialFilm} defaultDate={today} members={others} />
          <h2 className="pt-2 text-2xl">Prochaines séances</h2>
          {upcoming.length === 0 && <p className="text-sm text-muted">Rien de prévu pour l&apos;instant.</p>}
          {upcoming.map((e) => (
            <div key={e.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
              {e.poster && <img src={poster(e.poster, "w185")!} alt="" className="h-20 rounded-md" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-accent capitalize">
                  {new Date(`${e.startsAt}:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {e.startsAt.slice(11).replace(":", "h")}
                </p>
                <Link href={e.filmId ? `/film/${e.filmId}` : "#"} className="font-display block truncate text-lg hover:text-accent">{e.title}</Link>
                <p className="truncate text-xs text-muted">
                  {[e.place, guestsLine(e), e.withWhom && `avec ${e.withWhom}`].filter(Boolean).join(" · ")}
                </p>
                {e.note && <p className="truncate text-xs text-muted italic">{e.note}</p>}
                {e.link && (
                  <a href={e.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-accent">
                    {new URL(e.link).hostname.replace(/^www\./, "")}
                  </a>
                )}
              </div>
              <DeleteEventButton id={e.id} />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

// « avec @lea, @tom » pour l'organisateur ; « invité par @lea » pour un invité
function guestsLine(e: CinemaEvent) {
  if (!e.mine) return `invité par @${e.host}`;
  return e.guests.length ? `avec ${e.guests.map((g) => `@${g.name}`).join(", ")}` : null;
}
