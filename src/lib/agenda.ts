import { db, ensureSchema } from "./db";

export type CinemaEvent = {
  id: number;
  filmId: number | null;
  title: string;
  startsAt: string; // « 2026-11-02T20:30 », heure de Paris
  place: string | null;
  withWhom: string | null;
  note: string | null;
  poster: string | null;
  runtime: number | null;
};

let ready: Promise<void> | undefined;
const schema = () => (ready ??= ensureSchema());

const toEvent = (r: Record<string, unknown>): CinemaEvent => ({
  id: Number(r.id),
  filmId: r.film_id == null ? null : Number(r.film_id),
  title: String(r.title),
  startsAt: String(r.starts_at),
  place: (r.place as string) ?? null,
  withWhom: (r.with_whom as string) ?? null,
  note: (r.note as string) ?? null,
  poster: (r.poster as string) ?? null,
  runtime: r.runtime == null ? null : Number(r.runtime),
});

const SELECT = `SELECT e.*, COALESCE(f.custom_poster, f.poster_path) AS poster, f.runtime FROM events e LEFT JOIN films f ON f.id = e.film_id`;

export async function eventsBetween(from: string, to: string) {
  await schema();
  const { rows } = await db().execute({ sql: `${SELECT} WHERE e.starts_at >= ? AND e.starts_at < ? ORDER BY e.starts_at`, args: [from, to] });
  return rows.map(toEvent);
}

export async function upcomingEvents(limit = 20) {
  await schema();
  const now = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 16).replace(" ", "T");
  const { rows } = await db().execute({ sql: `${SELECT} WHERE e.starts_at >= ? ORDER BY e.starts_at LIMIT ?`, args: [now, limit] });
  return rows.map(toEvent);
}

export async function allEvents() {
  await schema();
  const { rows } = await db().execute(`${SELECT} ORDER BY e.starts_at`);
  return rows.map(toEvent);
}

export async function saveEvent(e: { id?: number; filmId: number | null; title: string; startsAt: string; place: string | null; withWhom: string | null; note: string | null }) {
  await schema();
  const args = [e.filmId, e.title.trim(), e.startsAt, e.place?.trim() || null, e.withWhom?.trim() || null, e.note?.trim() || null];
  if (e.id) {
    await db().execute({ sql: "UPDATE events SET film_id = ?, title = ?, starts_at = ?, place = ?, with_whom = ?, note = ? WHERE id = ?", args: [...args, e.id] });
    return e.id;
  }
  const res = await db().execute({ sql: "INSERT INTO events (film_id, title, starts_at, place, with_whom, note) VALUES (?, ?, ?, ?, ?, ?)", args });
  return Number(res.lastInsertRowid);
}

export async function deleteEvent(id: number) {
  await schema();
  await db().execute({ sql: "DELETE FROM events WHERE id = ?", args: [id] });
}

// --- Export iCalendar (.ics) : pour ajouter les séances au calendrier du téléphone ---

const icsDate = (local: string) => local.replace(/[-:]/g, "").slice(0, 13) + "00"; // 20261102T203000
const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

export function toIcs(events: CinemaEvent[], origin: string) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dreams//Agenda cinema//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Dreams · Séances", "X-WR-TIMEZONE:Europe/Paris"];
  for (const e of events) {
    const start = new Date(`${e.startsAt}:00`);
    const end = new Date(start.getTime() + ((e.runtime ?? 120) + 15) * 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const endLocal = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:dreams-event-${e.id}@dreams`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=Europe/Paris:${icsDate(e.startsAt)}`,
      `DTEND;TZID=Europe/Paris:${endLocal}`,
      `SUMMARY:${escape(`🎬 ${e.title}`)}`,
      e.place ? `LOCATION:${escape(e.place)}` : "",
      `DESCRIPTION:${escape([e.withWhom && `Avec ${e.withWhom}`, e.note, e.filmId && `${origin}/film/${e.filmId}`].filter(Boolean).join("\n"))}`,
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${escape(`${e.title} dans 1 h`)}`, "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}
