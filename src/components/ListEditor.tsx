"use client";
/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteUserListAction, saveUserListAction } from "@/app/actions";
import { FilmPicker, type Picked } from "./FilmPicker";

const img = (p: string | null) => (!p ? null : p.startsWith("/media/") ? p : `https://image.tmdb.org/t/p/w185${p}`);

type Initial = { id?: number; name: string; description: string; visibility: string; films: Picked[] };

const VISIBILITY = [
  { key: "membres", label: "Visible des membres" },
  { key: "prive", label: "Privée" },
];

// Créer ou modifier une liste : nom, description, visibilité, et les films (dans l'ordre, qu'on peut changer).
export function ListEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [films, setFilms] = useState(initial.films);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= films.length) return;
    const next = [...films];
    [next[i], next[j]] = [next[j], next[i]];
    setFilms(next);
  };

  const save = () =>
    start(async () => {
      const res = await saveUserListAction({ id: initial.id, name, description, visibility, keys: films.map((f) => f.key) });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push(`/listes/perso/${res.id}`);
      router.refresh();
    });

  const remove = () => {
    if (initial.id && confirm("Supprimer cette liste ?")) start(() => deleteUserListAction(initial.id!));
  };

  return (
    <div className="space-y-6">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={120}
        placeholder="Nom de la liste"
        className="w-full border-b border-border bg-transparent pb-2 text-2xl font-semibold outline-none focus:border-accent"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Description (facultatif)"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
      />

      <div className="flex rounded-full border border-border bg-surface p-0.5 text-sm">
        {VISIBILITY.map((v) => (
          <button key={v.key} type="button" onClick={() => setVisibility(v.key)} className={`flex-1 rounded-full py-2 ${visibility === v.key ? "bg-foreground text-background" : "text-muted"}`}>
            {v.label}
          </button>
        ))}
      </div>

      {films.length > 0 && (
        <ol className="space-y-2">
          {films.map((f, i) => (
            <li key={f.key} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-3">
              <span className="w-6 text-center text-sm text-muted tabular-nums">{i + 1}</span>
              <span className="aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                {img(f.poster) && <img src={img(f.poster)!} alt="" className="size-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {f.title} <span className="text-muted">{f.year}</span>
              </span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex size-8 items-center justify-center rounded-full text-muted disabled:opacity-25" aria-label="Monter">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === films.length - 1} className="flex size-8 items-center justify-center rounded-full text-muted disabled:opacity-25" aria-label="Descendre">↓</button>
              <button type="button" onClick={() => setFilms(films.filter((x) => x.key !== f.key))} className="flex size-8 items-center justify-center rounded-full text-muted" aria-label={`Retirer ${f.title}`}>✕</button>
            </li>
          ))}
        </ol>
      )}
      <FilmPicker picked={films} onChange={setFilms} showPicked={false} />

      {error && <p className="text-sm text-heart">{error}</p>}
      <button type="button" onClick={save} disabled={pending} className="w-full rounded-full bg-accent py-3 font-medium text-on-accent disabled:opacity-40">
        {pending ? "Enregistrement…" : "Enregistrer la liste"}
      </button>
      {initial.id && (
        <button type="button" onClick={remove} className="w-full py-2 text-sm text-heart">
          Supprimer la liste
        </button>
      )}
    </div>
  );
}
