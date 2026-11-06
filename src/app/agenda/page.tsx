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
import { PageHeader } from "@/components/ui/PageHeader";

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

  const upcomingByDay = upcoming;
  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="Amis"
        number={`${upcoming.length} séance${upcoming.length > 1 ? "s" : ""} à venir`}
        title="Agenda"
        actions={
          <a href={calendarUrl} className="btn" title="Ajoute toutes tes séances au calendrier de ton téléphone ou de ton ordinateur">
            Exporter vers mon calendrier
          </a>
        }
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <div className="min-w-0 space-y-16">
          {/* Le programme : les prochaines séances, en billets */}
          <section aria-labelledby="programme">
            <h2 id="programme" className="text-[2rem] leading-none md:text-[2.6rem]">
              Au programme
            </h2>
            {upcomingByDay.length === 0 ? (
              <div className="card mt-6 px-6 py-12 text-center">
                <p className="font-display text-2xl">Rien de prévu pour l&apos;instant</p>
                <p className="mt-2 text-[15px] text-muted">Planifiez une séance : au cinéma, ou à la maison entre amis.</p>
              </div>
            ) : (
              <ol className="mt-6 space-y-3">
                {upcomingByDay.map((e) => {
                  const d = new Date(`${e.startsAt}:00`);
                  return (
                    <li key={e.id} className="card grid grid-cols-[4.6rem_minmax(0,1fr)_auto] items-center gap-4 !rounded-[22px] p-3 pr-4 md:grid-cols-[6rem_4rem_minmax(0,1fr)_auto] md:gap-6 md:p-4">
                      <div className="text-center">
                        <span className="block text-[12px] text-muted capitalize">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                        <span className="block font-display text-[2.6rem] leading-none tabular">{d.getDate()}</span>
                        <span className="block text-[12px] text-muted capitalize">{d.toLocaleDateString("fr-FR", { month: "short" })}</span>
                      </div>
                      <span className="poster hidden aspect-[2/3] w-full md:block">{e.poster && <img src={poster(e.poster, "w185")!} alt="" className="size-full object-cover" />}</span>
                      <div className="min-w-0">
                        <p className="text-[14px] text-[var(--text-2)] tabular">{e.startsAt.slice(11).replace(":", " h ")}{e.place ? ` · ${e.place}` : ""}</p>
                        <Link href={e.filmId ? `/film/${e.filmId}` : "#"} className="mt-0.5 block truncate font-display text-[1.6rem] leading-tight md:text-[1.9rem]">
                          {e.title}
                        </Link>
                        <p className="mt-0.5 truncate text-[13px] text-muted">{[guestsLine(e), e.withWhom && `avec ${e.withWhom}`, e.note].filter(Boolean).join(" · ")}</p>
                        {e.link && (
                          <a href={e.link} target="_blank" rel="noreferrer" className="link-draw mt-1 inline-block text-[13px] text-[var(--text-2)]">
                            Réserver sur {new URL(e.link).hostname.replace(/^www./, "")}
                          </a>
                        )}
                      </div>
                      <DeleteEventButton id={e.id} />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Le mois */}
          <section aria-labelledby="mois">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id="mois" className="text-[2rem] leading-none capitalize md:text-[2.6rem]">
                {first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </h2>
              <div className="flex gap-1.5">
                <Link href={`/agenda?mois=${key(prev)}`} className="btn !size-11 !p-0" aria-label="Mois précédent">
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
                </Link>
                <Link href={`/agenda?mois=${key(next)}`} className="btn !size-11 !p-0" aria-label="Mois suivant">
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-7 border-t border-l border-[var(--line)] text-center text-[12px] text-muted">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="border-r border-b border-[var(--line)] py-2">
                  {d}
                </div>
              ))}
              {cells.map((d, i) => {
                const date = d ? `${key(first)}-${pad(d)}` : "";
                const events = d ? (byDay.get(d) ?? []) : [];
                const isToday = date === today;
                return (
                  <div key={i} className={`relative min-h-16 border-r border-b border-[var(--line)] p-1.5 text-left md:min-h-24 ${d ? "" : "bg-white/[0.015]"}`}>
                    {d && <span className={`inline-grid size-6 place-items-center rounded-full text-[12px] tabular ${isToday ? "bg-accent font-medium text-on-accent" : "text-muted"}`}>{d}</span>}
                    {events.map((e) => (
                      <Link key={e.id} href={e.filmId ? `/film/${e.filmId}` : "#"} className="mt-1 block" title={`${e.startsAt.slice(11)} · ${e.title}${e.place ? ` · ${e.place}` : ""}`}>
                        {e.poster ? <img src={poster(e.poster, "w185")!} alt={e.title} className="aspect-[2/3] w-full rounded-[2px] object-cover md:w-2/3" /> : <span className="block truncate rounded-full bg-accent px-1.5 text-[10px] text-on-accent">{e.title}</span>}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--nav-offset,4.5rem)+1.5rem)] lg:self-start">
          <div className="card p-5 md:p-6">
            <h2 className="mb-5 text-[1.8rem] leading-none">Planifier une séance</h2>
            <EventForm key={initialFilm?.id ?? "new"} initialFilm={initialFilm} defaultDate={today} members={others} />
          </div>
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
