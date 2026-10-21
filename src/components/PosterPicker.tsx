/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { posterOptionsAction, setPosterAction, uploadPosterAction } from "@/app/actions";
import type { PosterOption } from "@/lib/posters";

const LANGS: Record<string, string> = { fr: "FR", en: "EN", ja: "JA" };
const tmdbImg = (p: string, size = "w342") => `https://image.tmdb.org/t/p/${size}${p}`;

// Bouton « Changer l'affiche » posé sur l'affiche de la fiche film, et sa fenêtre de choix.
export function PosterPicker({ filmId, current, hasCustom, children }: { filmId: number; current: string | null; hasCustom: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PosterOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openPicker = () => {
    setOpen(true);
    if (!options) startTransition(async () => setOptions(await posterOptionsAction(filmId)));
  };

  // On ferme tout de suite : la nouvelle affiche apparaît dès qu'elle est enregistrée.
  const choose = (path: string | null) => {
    setOpen(false);
    startTransition(() => setPosterAction(filmId, path));
  };

  const upload = async (data: FormData) => {
    setError(null);
    const res = await uploadPosterAction(filmId, data);
    if (res.error) setError(res.error);
    else setOpen(false);
  };

  return (
    <>
      <div className="group/poster relative">
        {children}
        <button
          onClick={openPicker}
          className="absolute inset-x-2 bottom-2 rounded-lg bg-black/75 py-1.5 text-xs text-white opacity-0 backdrop-blur transition group-hover/poster:opacity-100 focus:opacity-100 max-md:opacity-100"
        >
          Changer l&apos;affiche
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface md:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="font-display text-3xl leading-none">Choisir l&apos;affiche</h2>
                <p className="mt-1 text-sm text-muted">Affiches du monde entier (TMDB), ou la tienne.</p>
              </div>
              <button onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-full border border-border" aria-label="Fermer">✕</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
              <form action={upload} className="flex items-center gap-2">
                <label className="cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent">
                  ⬆ Envoyer mon image
                  <input
                    name="poster"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  />
                </label>
              </form>
              {hasCustom && (
                <button onClick={() => choose(null)} className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
                  Revenir à l&apos;affiche d&apos;origine
                </button>
              )}
              {pending && <span className="text-sm text-muted">Un instant…</span>}
              {error && <span className="text-sm text-heart">{error}</span>}
            </div>

            <div className="overflow-y-auto p-5">
              {options === null ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {Array.from({ length: 12 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface-2" />)}
                </div>
              ) : options.length === 0 ? (
                <p className="text-muted">Aucune autre affiche sur TMDB pour ce film. Tu peux envoyer la tienne.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {options.map((o) => {
                    const selected = current === o.path;
                    return (
                      <button
                        key={o.path}
                        onClick={() => choose(o.path)}
                        disabled={pending}
                        className={`group relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 ring-2 transition ${selected ? "ring-accent" : "ring-transparent hover:ring-accent/60"}`}
                      >
                        <img src={tmdbImg(o.path)} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                        <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 text-[10px] text-white">
                          {o.lang ? LANGS[o.lang] ?? o.lang.toUpperCase() : "Sans texte"}
                        </span>
                        {selected && <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] text-on-accent">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
