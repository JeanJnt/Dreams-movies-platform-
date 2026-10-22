/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { posterOptionsAction, setOwnedAction, uploadCoverAction } from "@/app/actions";
import { sendFile } from "@/lib/upload-client";
import type { OwnedItem } from "@/lib/collection";
import type { PosterOption } from "@/lib/posters";
import { DvdCase, type CaseFilm } from "./DvdCase";

type Props = {
  filmId: number;
  initial: OwnedItem | null;
  formats: readonly string[];
  caseTypes: readonly { key: string; label: string }[];
  film: Omit<CaseFilm, "format" | "caseType" | "cover"> & { poster: string | null };
};

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs transition ${active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"}`;

// « Je possède ce film » : format, boîtier, édition et jaquette de MON exemplaire.
export function OwnButton({ filmId, initial, formats, caseTypes, film }: Props) {
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [format, setFormat] = useState(initial?.format ?? "Blu-ray");
  const [caseType, setCaseType] = useState<string>(initial?.caseType ?? "amaray");
  const [edition, setEdition] = useState(initial?.edition ?? "");
  const [cover, setCover] = useState<string | null>(initial?.cover ?? null);
  const [posters, setPosters] = useState<PosterOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const item = { format, caseType, edition: edition || null, cover };
      await setOwnedAction(filmId, item);
      setSaved({ ...item, caseType: caseType as OwnedItem["caseType"], ean: saved?.ean ?? null });
      setEditing(false);
    });

  const remove = () =>
    startTransition(async () => {
      await setOwnedAction(filmId, null);
      setSaved(null);
      setEditing(false);
    });

  const upload = async (data: FormData) => {
    setError(null);
    const file = data.get("cover");
    if (!(file instanceof File) || !file.size) return;
    try {
      // En ligne : la photo part directement vers le stockage (les photos de téléphone dépassent souvent 4,5 Mo).
      const sent = await sendFile(file, filmId, "cover");
      if (sent) setCover(sent.url);
      else {
        const res = await uploadCoverAction(filmId, data);
        if (res.error) throw new Error(res.error);
        setCover(res.url!);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const preview: CaseFilm = { ...film, format, caseType, cover: cover ?? film.poster };

  if (!editing) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        {saved ? (
          <div className="flex gap-4">
            <div className="w-24 shrink-0">
              <DvdCase film={{ ...film, format: saved.format, caseType: saved.caseType, cover: saved.cover ?? film.poster }} compact />
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg">📀 Dans ma collection</p>
              <p className="mt-1 text-sm text-muted">
                {saved.format} · {caseTypes.find((c) => c.key === saved.caseType)?.label}
              </p>
              {saved.edition && <p className="text-sm text-accent">{saved.edition}</p>}
              <button onClick={() => setEditing(true)} className="mt-2 text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
                Modifier
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="flex w-full items-center justify-between text-left">
            <span className="font-display text-lg">Je possède ce film</span>
            <span className="text-sm text-accent">+ Ajouter</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 rounded-2xl border border-accent/40 bg-surface p-5 ${pending ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="font-display text-lg">Mon exemplaire</p>
        <button onClick={() => setEditing(false)} className="text-xs text-muted hover:text-foreground">Annuler</button>
      </div>

      <div className="mx-auto w-28">
        <DvdCase film={preview} compact />
      </div>

      <Field label="Format">
        {formats.map((f) => <button key={f} onClick={() => setFormat(f)} className={chip(f === format)}>{f}</button>)}
      </Field>
      <Field label="Boîtier">
        {caseTypes.map((c) => <button key={c.key} onClick={() => setCaseType(c.key)} className={chip(c.key === caseType)}>{c.label}</button>)}
      </Field>
      <label className="block space-y-1.5">
        <span className="text-xs tracking-wider text-muted uppercase">Édition</span>
        <input value={edition} onChange={(e) => setEdition(e.target.value)} placeholder="Criterion, Carlotta, version restaurée…" className="field w-full" />
      </label>

      <Field label="Jaquette">
        <button onClick={() => setCover(null)} className={chip(!cover)}>Affiche du film</button>
        <button
          onClick={() => !posters && startTransition(async () => setPosters(await posterOptionsAction(filmId)))}
          className={chip(Boolean(cover?.startsWith("https://image.tmdb.org")))}
        >
          Choisir une affiche…
        </button>
        <form action={upload}>
          <label className={`${chip(Boolean(cover?.startsWith("/media/")))} inline-block cursor-pointer`}>
            📷 Photo de ma jaquette
            <input name="cover" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.currentTarget.form?.requestSubmit()} />
          </label>
        </form>
      </Field>
      {posters && (
        <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
          {posters.map((p) => {
            const url = `https://image.tmdb.org/t/p/w342${p.path}`;
            return (
              <button key={p.path} onClick={() => setCover(url)} className={`aspect-[2/3] overflow-hidden rounded ring-2 ${cover === url ? "ring-accent" : "ring-transparent"}`}>
                <img src={`https://image.tmdb.org/t/p/w185${p.path}`} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="text-sm text-heart">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button onClick={save} disabled={pending} className="font-display rounded-full bg-accent px-5 py-2 text-sm text-on-accent">
          {saved ? "Enregistrer" : "Ajouter à ma collection"}
        </button>
        {saved && <button onClick={remove} className="text-xs text-muted hover:text-heart">Retirer de la collection</button>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs tracking-wider text-muted uppercase">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}
