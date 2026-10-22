import { uid } from "./auth";
import { db, ensureSchema, posterSql } from "./db";

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
  mine: boolean; // séance que j'ai créée (sinon, un membre m'y a invité)
  host: string;
  guests: { id: number; name: string }[];
};


const schema = () => ensureSchema(); // mémorisé dans db.ts (et réessayé en cas d'échec)

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
  mine: Boolean(r.mine),
  host: String(r.host ?? ""),
  guests: typeof r.guests === "string" ? (JSON.parse(r.guests) as { id: number; name: string }[]).filter((g) => g.id) : [],
});

// Mes séances, et celles où un membre m'a invité (avec l'organisateur et les invités).
const select = (u: number) => `SELECT e.*, ${posterSql(u)} AS poster, f.runtime, (e.user_id = ${u}) AS mine, COALESCE(ow.username, ow.name) AS host,
    (SELECT json_group_array(json_object('id', g.user_id, 'name', COALESCE(gu.username, gu.name))) FROM event_guests g JOIN users gu ON gu.id = g.user_id WHERE g.event_id = e.id) AS guests
  FROM events e LEFT JOIN films f ON f.id = e.film_id LEFT JOIN users ow ON ow.id = e.user_id
  WHERE (e.user_id = ${u} OR e.id IN (SELECT event_id FROM event_guests WHERE user_id = ${u}))`;

export async function eventsBetween(from: string, to: string) {
  await schema();
  const { rows } = await db().execute({ sql: `${select(await uid())} AND e.starts_at >= ? AND e.starts_at < ? ORDER BY e.starts_at`, args: [from, to] });
  return rows.map(toEvent);
}

export async function upcomingEvents(limit = 20) {
  await schema();
  const now = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 16).replace(" ", "T");
  const { rows } = await db().execute({ sql: `${select(await uid())} AND e.starts_at >= ? ORDER BY e.starts_at LIMIT ?`, args: [now, limit] });
  return rows.map(toEvent);
}

// userId fourni seulement pour l'abonnement .ics (lien secret, sans session).
export async function allEvents(userId?: number) {
  await schema();
  const { rows } = await db().execute(`${select(userId ?? (await uid()))} ORDER BY e.starts_at`);
  return rows.map(toEvent);
}

// Les invités peuvent aussi modifier la séance : la modification se voit chez tout le monde (c'est la même séance).
// guestIds : seul l'organisateur choisit les membres invités.
export async function saveEvent(e: { id?: number; filmId: number | null; title: string; startsAt: string; place: string | null; withWhom: string | null; note: string | null; guestIds?: number[] }) {
  await schema();
  const u = await uid();
  const args = [e.filmId, e.title.trim(), e.startsAt, e.place?.trim() || null, e.withWhom?.trim() || null, e.note?.trim() || null];
  if (e.id) {
    await db().execute({
      sql: "UPDATE events SET film_id = ?, title = ?, starts_at = ?, place = ?, with_whom = ?, note = ? WHERE id = ? AND (user_id = ? OR id IN (SELECT event_id FROM event_guests WHERE user_id = ?))",
      args: [...args, e.id, u, u],
    });
    if (e.guestIds) await setGuests(e.id, e.guestIds, u);
    return e.id;
  }
  const res = await db().execute({ sql: "INSERT INTO events (film_id, title, starts_at, place, with_whom, note, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [...args, u] });
  const id = Number(res.lastInsertRowid);
  if (e.guestIds?.length) await setGuests(id, e.guestIds, u);
  return id;
}

async function setGuests(eventId: number, guestIds: number[], owner: number) {
  const own = await db().execute({ sql: "SELECT 1 FROM events WHERE id = ? AND user_id = ?", args: [eventId, owner] });
  if (!own.rows[0]) return;
  const ids = [...new Set(guestIds.filter((g) => Number.isInteger(g) && g > 0 && g !== owner))];
  const valid = ids.length ? (await db().execute(`SELECT id FROM users WHERE id IN (${ids.join(",")})`)).rows.map((r) => Number(r.id)) : [];
  await db().batch(
    [
      { sql: "DELETE FROM event_guests WHERE event_id = ?", args: [eventId] },
      ...valid.map((g) => ({ sql: "INSERT INTO event_guests (user_id, event_id) VALUES (?, ?)", args: [g, eventId] })),
    ],
    "write",
  );
}

// L'organisateur supprime la séance pour tout le monde ; un invité se retire seulement de la séance.
export async function deleteEvent(id: number) {
  await schema();
  const u = await uid();
  const own = await db().execute({ sql: "SELECT 1 FROM events WHERE id = ? AND user_id = ?", args: [id, u] });
  if (own.rows[0]) {
    await db().batch(
      [
        { sql: "DELETE FROM event_guests WHERE event_id = ?", args: [id] },
        { sql: "DELETE FROM events WHERE id = ?", args: [id] },
      ],
      "write",
    );
  } else {
    await db().execute({ sql: "DELETE FROM event_guests WHERE event_id = ? AND user_id = ?", args: [id, u] });
  }
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
