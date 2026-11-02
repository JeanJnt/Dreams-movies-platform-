/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { imageOptionsAction, setFilmImageAction, setUploadedFilmImageAction, uploadFilmImageAction } from "@/app/actions";
import type { ImageKind, ImageOption } from "@/lib/film-images";
import { sendFile } from "@/lib/upload-client";

const LANGS: Record<string, string> = { fr: "FR", en: "EN", ja: "JA" };
const tmdbImg = (p: string, size: string) => `https://image.tmdb.org/t/p/${size}${p}`;

const TEXTS: Record<ImageKind, { title: string; hint: string; reset: string }> = {
  backdrop: { title: "Choisir le fond", hint: "Les images du film (TMDB), ou la tienne.", reset: "Revenir au fond d'origine" },
  disc: { title: "Choisir l'image du disque", hint: "Les images et affiches du film (TMDB), ou la tienne.", reset: "Revenir à l'image d'origine" },
};

// Fenêtre de choix d'une image du film. Rendue à la racine de la page : le disque qui tourne la couperait sinon.
export function FilmImagePicker({ filmId, kind, current, hasCustom, onClose }: { filmId: number; kind: ImageKind; current: string | null; hasCustom: boolean; onClose: () => void }) {
  const [options, setOptions] = useState<ImageOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const text = TEXTS[kind];

  useEffect(() => {
    imageOptionsAction(filmId)
      .then(({ backdrops, posters }) => setOptions(kind === "disc" ? [...backdrops, ...posters] : backdrops))
      .catch(() => setOptions([]));
  }, [filmId, kind]);

  // On attend l'enregistrement avant de fermer : la nouvelle image est alors déjà sur la page.
  const choose = (path: string | null) =>
    startTransition(async () => {
      await setFilmImageAction(filmId, kind, path);
      onClose();
    });

  const upload = (data: FormData) =>
    startTransition(async () => {
      setError(null);
      const file = data.get("image");
      if (!(file instanceof File) || !file.size) return;
      try {
        // En ligne : envoi direct vers le stockage ; en local : formulaire classique.
        const sent = await sendFile(file, filmId, kind);
        if (sent) await setUploadedFilmImageAction(filmId, kind, sent.url);
        else {
          const res = await uploadFilmImageAction(filmId, kind, data);
          if (res.error) throw new Error(res.error);
        }
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  const round = kind === "disc";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 md:items-center" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl leading-none md:text-2xl">{text.title}</h2>
            <p className="mt-1 text-sm text-muted">{text.hint}</p>
          </div>
          <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full border border-border" aria-label="Fermer">✕</button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <form action={upload}>
            <label className="cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent">
              ⬆ Envoyer mon image
              <input name="image" type="file" accept="image/*" className="hidden" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
            </label>
          </form>
          {hasCustom && (
            <button onClick={() => choose(null)} disabled={pending} className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
              {text.reset}
            </button>
          )}
          {pending && <span className="text-sm text-muted">Un instant…</span>}
          {error && <span className="text-sm text-heart">{error}</span>}
        </div>

        <div className="overflow-y-auto p-5">
          {options === null ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className={`animate-pulse bg-surface-2 ${round ? "aspect-square rounded-full" : "aspect-video rounded-lg"}`} />)}
            </div>
          ) : options.length === 0 ? (
            <p className="text-muted">Aucune image sur TMDB pour ce film. Tu peux envoyer la tienne.</p>
          ) : (
            <div className={`grid gap-3 ${round ? "grid-cols-3 md:grid-cols-5" : "grid-cols-2 md:grid-cols-3"}`}>
              {options.map((o) => {
                const selected = current === o.path;
                return (
                  <button
                    key={o.path}
                    onClick={() => choose(o.path)}
                    disabled={pending}
                    className={`group relative overflow-hidden bg-surface-2 ring-2 transition ${round ? "aspect-square rounded-full" : "aspect-video rounded-lg"} ${selected ? "ring-accent" : "ring-transparent hover:ring-accent/60"}`}
                  >
                    <img src={tmdbImg(o.path, o.shape === "wide" ? "w780" : "w342")} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                    {!round && o.lang && <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 text-[10px] text-white">{LANGS[o.lang] ?? o.lang.toUpperCase()}</span>}
                    {selected && <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] text-on-accent">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Bouton « Changer le fond » posé sur l'en-tête de la fiche film.
export function BackdropButton({ filmId, current, hasCustom }: { filmId: number; current: string | null; hasCustom: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="absolute top-4 left-4 z-10 rounded-lg bg-black/75 px-3 py-1.5 text-xs text-white backdrop-blur md:top-8 md:left-8">
        Changer le fond
      </button>
      {open && <FilmImagePicker filmId={filmId} kind="backdrop" current={current} hasCustom={hasCustom} onClose={() => setOpen(false)} />}
    </>
  );
}
