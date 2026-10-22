"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enrichStepAction, importLetterboxdAction, recoStepAction } from "@/app/auth-actions";
import type { ImportSummary } from "@/lib/importer";
import { LetterboxdConnect } from "./LetterboxdConnect";

type Phase = "idle" | "import" | "enrich" | "reco" | "done" | "error";

// Import de l'export Letterboxd, puis on complète tout, étape par étape, avec une barre de progression :
// 1. lecture du .zip  2. affiches et infos TMDB  3. recommandations  4. alertes cinéma
export function ImportPanel({ welcome, letterboxdConnected }: { welcome?: boolean; letterboxdConnected?: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [progress, setProgress] = useState({ label: "", pct: 0 });
  const [error, setError] = useState<string | null>(null);

  const run = async (form: FormData) => {
    setError(null);
    setPhase("import");
    setProgress({ label: "Lecture de ton export Letterboxd…", pct: 3 });
    const res = await importLetterboxdAction(form);
    if (res.error || !res.summary) {
      setError(res.error ?? "Import impossible.");
      setPhase("error");
      return;
    }
    setSummary(res.summary);

    // Les films que personne n'avait encore : on récupère leurs affiches et infos sur TMDB.
    setPhase("enrich");
    let first: number | null = null;
    for (;;) {
      const r = await enrichStepAction();
      first ??= r.remaining + r.done;
      const pct = first ? 10 + Math.round(((first - r.remaining) / first) * 50) : 60;
      setProgress({ label: `Affiches et infos des films : ${r.remaining} restants`, pct });
      if (!r.done || !r.remaining) break;
    }

    setPhase("reco");
    setProgress({ label: "Analyse de tes films préférés…", pct: 62 });
    const seeds = await recoStepAction("seeds");
    const total = seeds.remaining || 1;
    for (let r = seeds; r.remaining; ) {
      r = await recoStepAction("details");
      setProgress({ label: `Préparation de tes conseils : ${r.remaining} restants`, pct: 62 + Math.round(((total - r.remaining) / total) * 28) });
    }
    setProgress({ label: "Plateformes de ta watchlist…", pct: 92 });
    for (let r = await recoStepAction("providers"); r.remaining; r = await recoStepAction("providers")) {
      setProgress({ label: `Plateformes de ta watchlist : ${r.remaining} restants`, pct: 94 });
    }
    setProgress({ label: "Films au cinéma…", pct: 97 });
    await recoStepAction("alerts");
    setProgress({ label: "Terminé !", pct: 100 });
    setPhase("done");
    router.refresh();
  };

  return (
    <section className={`rounded-3xl border p-5 md:p-6 ${welcome ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}>
      <h2 className="text-xl md:text-2xl">{welcome ? "Bienvenue ! Importe ton Letterboxd" : "Importer depuis Letterboxd"}</h2>
      <p className="mt-2 text-sm text-muted">
        Sur Letterboxd : <b>Settings → Import &amp; Export → Export your data</b>. Tu reçois un fichier .zip, dépose-le ici.
        Tu peux réimporter quand tu veux : tes critiques Dreams, ta collection et ton agenda sont conservés.
      </p>

      {(phase === "idle" || phase === "error") && (
        <form action={run} className="mt-4 flex flex-wrap items-center gap-3">
          <input name="zip" type="file" accept=".zip,application/zip" required className="w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-foreground" />
          <button className="rounded-full bg-accent px-5 py-2 text-on-accent">Importer</button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-heart">{error}</p>}

      {phase !== "idle" && phase !== "error" && (
        <div className="mt-5 space-y-2">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="text-sm text-muted">{progress.label}</p>
          {phase !== "done" && <p className="text-xs text-muted">Garde cette page ouverte : la première fois, ça peut prendre quelques minutes.</p>}
        </div>
      )}

      {summary && (
        <p className="mt-4 text-sm">
          ✓ <b>{summary.watched.toLocaleString("fr-FR")}</b> films vus · {summary.ratings} notes · {summary.likes} coups de cœur ·{" "}
          {summary.diary} entrées de journal · {summary.reviews} reviews Letterboxd · {summary.watchlist} en watchlist · {summary.lists} listes
        </p>
      )}
      {/* Juste après l'import : on propose de connecter Letterboxd pour la suite (pseudo trouvé dans l'export) */}
      {phase === "done" && !letterboxdConnected && (
        <div className="mt-5">
          <LetterboxdConnect connected={null} suggested={summary?.username} highlight />
        </div>
      )}
      {phase === "done" && (
        <button onClick={() => router.push("/")} className="mt-4 rounded-full bg-accent px-5 py-2 text-on-accent">
          Découvrir mon Dreams
        </button>
      )}
    </section>
  );
}
