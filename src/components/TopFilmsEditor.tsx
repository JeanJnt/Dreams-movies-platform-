"use client";
/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTopFilmsAction } from "@/app/actions";
import { FilmPicker, type Picked } from "./FilmPicker";

const img = (p: string | null) => (!p ? null : p.startsWith("/media/") ? p : `https://image.tmdb.org/t/p/w185${p}`);

// Mes 10 films préférés : on les cherche, puis on les range (flèches pour changer l'ordre).
export function TopFilmsEditor({ initial }: { initial: Picked[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= picked.length) return;
    const next = [...picked];
    [next[i], next[j]] = [next[j], next[i]];
    setPicked(next);
    setSaved(false);
  };
  const change = (p: Picked[]) => {
    setPicked(p);
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      {picked.length > 0 && (
        <ol className="space-y-2">
          {picked.map((p, i) => (
            <li key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-3">
              <span className="w-6 text-center text-lg font-semibold text-accent tabular-nums">{i + 1}</span>
              <span className="aspect-[2/3] w-10 shrink-0 overflow-hidden rounded bg-surface-2">
                {img(p.poster) && <img src={img(p.poster)!} alt="" className="size-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {p.title} <span className="text-sm text-muted">{p.year}</span>
              </span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-25" aria-label="Monter">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === picked.length - 1} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-25" aria-label="Descendre">↓</button>
              <button type="button" onClick={() => change(picked.filter((x) => x.key !== p.key))} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label={`Retirer ${p.title}`}>✕</button>
            </li>
          ))}
        </ol>
      )}

      <FilmPicker picked={picked} onChange={change} max={10} showPicked={false} />

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setTopFilmsAction(picked.map((p) => p.key));
            setSaved(true);
            router.refresh();
          })
        }
        className="w-full rounded-full bg-accent py-3 font-medium text-on-accent disabled:opacity-40"
      >
        {pending ? "Enregistrement…" : saved ? "Enregistré" : `Enregistrer mon top (${picked.length}/10)`}
      </button>
    </div>
  );
}
