"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { connectLetterboxdAction, disconnectLetterboxdAction, syncLetterboxdAction } from "@/app/auth-actions";

type Props = { connected: string | null; suggested?: string | null; syncedAt?: string | null; highlight?: boolean };

const ago = (iso: string) => {
  const d = new Date(iso.replace(" ", "T") + "Z");
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

type SyncReport = { ok: boolean; error?: string; newFilms: number; newReviews: number };

const syncMessage = (r: SyncReport) =>
  r.ok
    ? { ok: true, text: `✓ ${r.newFilms ? `${r.newFilms} nouveau${r.newFilms > 1 ? "x" : ""} film${r.newFilms > 1 ? "s" : ""}` : "Aucun nouveau film"}${r.newReviews ? ` et ${r.newReviews} review${r.newReviews > 1 ? "s" : ""}` : ""} depuis Letterboxd.` }
    : { ok: false, text: r.error ?? "Synchronisation impossible." };

// Le bouton seul, pour le profil : récupère tout de suite ce qui est nouveau sur Letterboxd.
export function LetterboxdSyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() => start(async () => { setMessage(syncMessage(await syncLetterboxdAction())); router.refresh(); })}
        className="btn"
      >
        {pending ? "Synchronisation…" : "Synchroniser Letterboxd"}
      </button>
      {message && <p className={`text-xs ${message.ok ? "text-accent" : "text-heart"}`}>{message.text}</p>}
    </div>
  );
}

// Connexion au flux Letterboxd : ensuite, les nouveaux films et reviews arrivent tout seuls chaque matin.
export function LetterboxdConnect({ connected, suggested, syncedAt, highlight }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(connected ?? suggested ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const report = (r: SyncReport) => setMessage(syncMessage(r));

  return (
    <section className={`space-y-4 rounded-3xl border p-5 md:p-6 ${highlight ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}>
      <div>
        <h2 className="font-display text-[1.7rem] leading-[1.1] md:text-[2.2rem]">{highlight ? "Dernière étape : connecte ton Letterboxd" : "Synchronisation Letterboxd"}</h2>
        <p className="mt-2 text-sm text-muted">
          Chaque matin, Dreams récupère tes <b>nouveaux films</b> et tes <b>reviews</b> depuis ton profil Letterboxd. Plus besoin de réimporter à chaque fois.
          Ton profil Letterboxd doit être public.
        </p>
      </div>

      {connected ? (
        <div className="space-y-3">
          <p className="text-sm">
            Connecté à <a href={`https://letterboxd.com/${connected}/`} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">letterboxd.com/{connected}</a>
            {syncedAt && <span className="text-muted"> · dernière synchro {ago(syncedAt)}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending}
              onClick={() => start(async () => { report(await syncLetterboxdAction()); router.refresh(); })}
              className="btn btn-primary disabled:opacity-50"
            >
              {pending ? "Synchronisation…" : "↻ Synchroniser maintenant"}
            </button>
            <button
              disabled={pending}
              onClick={() => confirm("Arrêter la synchronisation automatique ? Tes films déjà importés restent.") && start(async () => { await disconnectLetterboxdAction(); router.refresh(); })}
              className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
            >
              Déconnecter
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => { report(await connectLetterboxdAction(username)); router.refresh(); });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-sm text-muted">letterboxd.com/</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ton-pseudo" required className="field w-44" autoCapitalize="none" autoCorrect="off" />
          <button disabled={pending} className="btn btn-primary disabled:opacity-50">
            {pending ? "Connexion…" : "Connecter"}
          </button>
        </form>
      )}

      {message && <p className={`text-sm ${message.ok ? "text-accent" : "text-heart"}`}>{message.text}</p>}
      <p className="text-xs text-muted">
        Le flux Letterboxd ne contient que ton journal (les films vus avec une date). Pour la watchlist et les listes, réimporte ton export .zip de temps en temps.
      </p>
    </section>
  );
}
