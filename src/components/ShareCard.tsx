/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";

// Aperçu de la carte de partage + boutons « Partager » (téléphone) et « Télécharger ».
export function ShareCard({ id, title }: { id: number; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const card = useRef<File | null>(null);
  const url = `/critiques/${id}/carte`;
  const filename = `dreams-${title.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}.png`;

  const share = async () => {
    setBusy(true);
    setNote(null);
    try {
      if (!card.current) {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Carte indisponible");
        card.current = new File([await res.blob()], filename, { type: "image/png" });
      }
      if (navigator.canShare?.({ files: [card.current] })) await navigator.share({ files: [card.current], title });
      else setOpen(true);
    } catch (e) {
      // Après un long chargement, le téléphone peut refuser le partage : la carte est gardée, un second toucher suffit.
      if ((e as Error).name === "NotAllowedError") setNote("Carte prête : touche encore « Partager ».");
      else if ((e as Error).name !== "AbortError") setNote("Partage impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display mr-auto">Carte de partage</span>
        <button onClick={() => setOpen(!open)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">{open ? "Masquer" : "Aperçu"}</button>
        <button onClick={share} disabled={busy} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">{busy ? "…" : "Partager"}</button>
        <a href={url} download={filename} className="rounded-full bg-accent px-3 py-1.5 text-xs text-on-accent">Télécharger</a>
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
      {open && <img src={url} alt={`Carte de partage : ${title}`} className="mx-auto mt-4 w-full max-w-sm rounded-xl shadow-2xl" />}
    </div>
  );
}
