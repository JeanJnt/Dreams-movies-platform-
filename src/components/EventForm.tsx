/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useTransition } from "react";
import { saveEventAction, searchMyFilmsAction } from "@/app/actions";

type FilmHit = { id: number; title: string; year: number | null; poster: string | null };

const posterUrl = (p: string | null) => (!p ? null : p.startsWith("/media/") || p.startsWith("http") ? p : `https://image.tmdb.org/t/p/w92${p}`);

// Ajouter une séance : un film (de ma base), une date, un lieu, avec qui.
// members : les autres membres, qu'on peut inviter (la séance apparaît alors aussi dans leur agenda).
export function EventForm({ initialFilm, defaultDate, members = [] }: { initialFilm?: FilmHit | null; defaultDate: string; members?: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(Boolean(initialFilm));
  const [film, setFilm] = useState<FilmHit | null>(initialFilm ?? null);
  const [title, setTitle] = useState(initialFilm?.title ?? "");
  const [hits, setHits] = useState<FilmHit[]>([]);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("20:30");
  const [place, setPlace] = useState("");
  const [withWhom, setWithWhom] = useState("");
  const [note, setNote] = useState("");
  const [guests, setGuests] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Suggestions de films pendant la frappe
  useEffect(() => {
    if (film || title.trim().length < 2) return setHits([]);
    const t = setTimeout(() => startTransition(async () => setHits(await searchMyFilmsAction(title))), 250);
    return () => clearTimeout(t);
  }, [title, film]);

  const submit = () =>
    startTransition(async () => {
      try {
        await saveEventAction({ filmId: film?.id ?? null, title: film?.title ?? title, startsAt: `${date}T${time}`, place, withWhom, note, guestIds: guests });
        setOpen(false);
        setFilm(null);
        setTitle("");
        setPlace("");
        setWithWhom("");
        setNote("");
        setGuests([]);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-border p-5 text-lg transition hover:border-accent hover:text-accent">
        + Planifier une séance
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-accent/40 bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Nouvelle séance</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-foreground">Annuler</button>
      </div>

      <div className="relative">
        {film ? (
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2">
            {posterUrl(film.poster) && <img src={posterUrl(film.poster)!} alt="" className="h-14 rounded" />}
            <span className="flex-1">{film.title} <span className="text-muted">{film.year}</span></span>
            <button onClick={() => { setFilm(null); setTitle(""); }} className="px-2 text-muted">✕</button>
          </div>
        ) : (
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quel film ? (ou le nom d'un événement)" className="field w-full" autoFocus />
        )}
        {hits.length > 0 && !film && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            {hits.map((h) => (
              <button key={h.id} onClick={() => { setFilm(h); setHits([]); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                {posterUrl(h.poster) && <img src={posterUrl(h.poster)!} alt="" className="h-10 rounded-sm" />}
                <span>{h.title} <span className="text-muted">{h.year}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field" />
      </div>
      <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Où ? (Le Champo, MK2 Bibliothèque, à la maison…)" className="field w-full" list="places" />
      <datalist id="places">
        {["À la maison", "La Cinémathèque française", "Le Champo", "Le Grand Action", "Christine Cinéma Club", "Le Louxor", "MK2 Bibliothèque", "UGC Ciné Cité Les Halles", "Le Max Linder", "L'Archipel", "Le Reflet Médicis", "Studio des Ursulines"].map((p) => <option key={p} value={p} />)}
      </datalist>
      {members.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-muted">Inviter des membres (la séance s&apos;ajoute à leur agenda)</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = guests.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => setGuests(on ? guests.filter((g) => g !== m.id) : [...guests, m.id])} className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-accent bg-accent text-on-accent" : "border-border"}`}>
                  @{m.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <input value={withWhom} onChange={(e) => setWithWhom(e.target.value)} placeholder="Avec qui d'autre ?" className="field w-full" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (version restaurée, rencontre avec le réalisateur…)" className="field w-full" />
      {error && <p className="text-sm text-heart">{error}</p>}
      <button onClick={submit} disabled={pending || (!film && !title.trim())} className="w-full rounded-full bg-accent py-3 text-on-accent disabled:opacity-40">
        Ajouter à l&apos;agenda
      </button>
    </div>
  );
}
