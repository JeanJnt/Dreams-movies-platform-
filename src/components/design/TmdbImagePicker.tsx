"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { imageOptionsAction } from "@/app/actions";
import type { ImageOption } from "@/lib/film-images";

/*
 * Les affiches et les images du film (TMDB), pour habiller un boîtier ou un disque.
 * L'image choisie est téléchargée en pleine résolution, puis passe par le recadrage comme une image importée.
 */
type Tab = "posters" | "backdrops";
const LANGS: Record<string, string> = { fr: "FR", en: "EN", ja: "JA" };
const thumb = (p: string) => `/api/img?s=w342&p=${encodeURIComponent(p)}`;
const full = (p: string) => `/api/img?s=original&p=${encodeURIComponent(p)}`;

export function TmdbImagePicker({ filmId, prefer, onCancel, onPick }: { filmId: number; prefer: Tab; onCancel: () => void; onPick: (file: File, kind: Tab) => void }) {
  const [opts, setOpts] = useState<{ backdrops: ImageOption[]; posters: ImageOption[] } | null>(null);
  const [tab, setTab] = useState<Tab>(prefer);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    imageOptionsAction(filmId)
      .then(setOpts)
      .catch(() => setError("Les images de ce film sont indisponibles pour le moment."));
  }, [filmId]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);

  const pick = async (o: ImageOption) => {
    setLoading(o.path);
    setError(null);
    try {
      const res = await fetch(full(o.path));
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      onPick(new File([blob], o.path.replace(/^\//, ""), { type: blob.type || "image/jpeg" }), tab);
    } catch {
      setError("Cette image n'a pas pu être chargée. Choisissez-en une autre.");
      setLoading(null);
    }
  };

  const list = opts ? opts[tab] : [];
  return (
    <div className="fixed inset-0 z-[260] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="tmdb-titre">
      <div className="card flex max-h-[88svh] w-full max-w-[52rem] flex-col p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="tmdb-titre" className="font-display text-[1.5rem] leading-none">
            Images du film
          </h2>
          <div className="flex rounded-full p-1 ring-1 ring-[var(--line-2)]" role="group" aria-label="Type d'image">
            {(
              [
                ["posters", "Affiches"],
                ["backdrops", "Images de fond"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={`min-h-9 rounded-full px-4 text-[13px] transition-colors ${tab === k ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}>
                {l}
                {opts && <span className="ml-1.5 opacity-60 tabular">{opts[k].length}</span>}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[13.5px] text-muted">Choisissez une image : vous la cadrerez ensuite au format de la surface.</p>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!opts && !error && <p className="py-16 text-center text-[14px] text-muted">Chargement des images…</p>}
          {opts && !list.length && <p className="py-16 text-center text-[14px] text-muted">{tab === "posters" ? "Aucune affiche disponible pour ce film." : "Aucune image de fond disponible pour ce film."}</p>}
          <ul className={`grid gap-2.5 ${tab === "posters" ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-3"}`}>
            {list.map((o) => (
              <li key={o.path}>
                <button
                  type="button"
                  onClick={() => pick(o)}
                  disabled={Boolean(loading)}
                  className={`group relative block w-full overflow-hidden rounded-[6px] bg-[var(--surface-2)] ring-1 ring-[var(--line)] transition hover:ring-2 hover:ring-[var(--accent)] disabled:opacity-60 ${tab === "posters" ? "aspect-[2/3]" : "aspect-video"}`}
                  aria-label={`Choisir cette ${tab === "posters" ? "affiche" : "image"}${o.lang ? ` (${LANGS[o.lang] ?? o.lang.toUpperCase()})` : ", sans texte"}`}
                >
                  <img src={thumb(o.path)} alt="" loading="lazy" className="size-full object-cover" />
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] text-white">{o.lang ? (LANGS[o.lang] ?? o.lang.toUpperCase()) : "Sans texte"}</span>
                  {loading === o.path && <span className="absolute inset-0 grid place-items-center bg-black/60 text-[13px] text-white">Chargement…</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-muted" role="status">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
