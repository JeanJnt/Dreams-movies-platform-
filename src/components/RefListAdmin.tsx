"use client";

import { useState, useTransition } from "react";
import { addRefListAction, deleteRefListAction, enrichStepAction } from "@/app/auth-actions";

type RefList = { slug: string; name: string; total: number };

const TABS = [
  { key: "tmdb-list", label: "Liste TMDB" },
  { key: "letterboxd-csv", label: "Export Letterboxd (CSV)" },
  { key: "tmdb-top", label: "Top 250 TMDB" },
] as const;

// Ajout des listes de référence, puis complétion des fiches des nouveaux films (affiches, réalisateurs…).
export function RefListAdmin({ lists }: { lists: RefList[] }) {
  const [kind, setKind] = useState<(typeof TABS)[number]["key"]>("tmdb-list");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = (form: FormData) =>
    start(async () => {
      setMessage({ ok: true, text: "Import de la liste…" });
      form.set("kind", kind);
      const res = await addRefListAction(form);
      if (res.error) return setMessage({ ok: false, text: res.error });
      // Les nouveaux films du catalogue : on complète leurs fiches, par paquets.
      for (let r = await enrichStepAction(); r.done && r.remaining; r = await enrichStepAction()) {
        setMessage({ ok: true, text: `${res.ok} Fiches des films : ${r.remaining} restantes…` });
      }
      setMessage({ ok: true, text: `${res.ok} ✓ Fiches complètes.` });
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setKind(t.key)} className={`rounded-full border px-3 py-1 text-xs ${kind === t.key ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <form action={submit} className="space-y-3">
        {kind === "tmdb-list" && (
          <>
            <input name="url" required placeholder="https://www.themoviedb.org/list/…" className="field w-full" />
            <p className="text-xs text-muted">
              Sur themoviedb.org, cherche par exemple « Sight and Sound 2022 » ou « Letterboxd Top 500 » dans les listes publiques, puis copie l&apos;adresse de la liste.
            </p>
          </>
        )}
        {kind === "letterboxd-csv" && (
          <>
            <input name="csv" type="file" accept=".csv,text/csv" required className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-foreground" />
            <p className="text-xs text-muted">Le fichier .csv d&apos;une liste Letterboxd (par exemple une liste de ton export, dans le dossier « lists »).</p>
          </>
        )}
        {kind === "tmdb-top" && <p className="text-sm text-muted">Les 250 films les mieux notés par les membres de TMDB.</p>}
        {kind !== "tmdb-top" && <input name="name" placeholder="Nom de la liste (facultatif)" maxLength={120} className="field w-full" />}
        <button disabled={pending} className="rounded-full bg-accent px-5 py-2 text-on-accent disabled:opacity-50">+ Ajouter la liste</button>
      </form>
      {message && <p className={`text-sm ${message.ok ? "text-accent" : "text-heart"}`}>{message.text}</p>}

      {lists.length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {lists.map((l) => (
            <li key={l.slug} className="flex items-center gap-3 py-2">
              <span className="flex-1 truncate">{l.name}</span>
              <span className="text-xs text-muted">{l.total} films</span>
              <button
                onClick={() => confirm(`Supprimer la liste « ${l.name} » pour tous les membres ?`) && start(() => deleteRefListAction(l.slug))}
                className="text-xs text-muted hover:text-heart"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
