"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { FilmHit } from "@/lib/search";
import { longEnough } from "@/lib/titles";

export type Picked = { key: string; title: string; year: number | null; poster: string | null };

const img = (p: string | null) => (!p ? null : p.startsWith("/media/") ? p : `https://image.tmdb.org/t/p/w185${p}`);

// Choisir plusieurs films : on tape, on touche les suggestions, ils s'ajoutent à la sélection (qu'on peut retirer).
// max : limite (ex. 10 pour le top) ; showPicked = false quand la page affiche elle-même la sélection.
export function FilmPicker({ picked, onChange, max, showPicked = true }: { picked: Picked[]; onChange: (p: Picked[]) => void; max?: number; showPicked?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FilmHit[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const full = max != null && picked.length >= max;

  useEffect(() => {
    if (!longEnough(q)) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}&films=10`, { signal: ctrl.signal });
        if (res.ok) setHits((await res.json()).films);
      } catch {
        // frappe plus récente
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const add = (h: FilmHit) => {
    if (full || picked.some((p) => p.key === h.key)) return;
    onChange([...picked, { key: h.key, title: h.sub ?? h.title, year: h.year, poster: h.poster }]);
    setQ("");
    input.current?.focus();
  };

  return (
    <div className="space-y-4">
      {showPicked && picked.length > 0 && (
        <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {picked.map((p, i) => (
            <li key={p.key} className="relative w-20 shrink-0 snap-start">
              <div className="aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
                {img(p.poster) && <img src={img(p.poster)!} alt="" className="size-full object-cover" />}
              </div>
              {max != null && <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">{i + 1}</span>}
              <button
                type="button"
                onClick={() => onChange(picked.filter((x) => x.key !== p.key))}
                className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background"
                aria-label={`Retirer ${p.title}`}
              >
                ✕
              </button>
              <p className="mt-1 line-clamp-2 text-[11px] leading-tight">{p.title}</p>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={full}
        placeholder={full ? `${max} films choisis` : "Chercher un film à ajouter…"}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent disabled:opacity-60"
      />

      {hits.length > 0 && !full && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {hits.map((h) => {
            const already = picked.some((p) => p.key === h.key);
            return (
              <li key={h.key}>
                <button type="button" onClick={() => add(h)} disabled={already} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50">
                  <span className="aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                    {img(h.poster) && <img src={img(h.poster)!} alt="" className="size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{h.title} <span className="text-sm text-muted">{h.year}</span></span>
                    {h.sub && <span className="block truncate text-xs text-muted">{h.sub}</span>}
                  </span>
                  <span className="text-lg text-accent">{already ? "✓" : "+"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
