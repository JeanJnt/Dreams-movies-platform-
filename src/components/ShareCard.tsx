/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

// Aperçu de la carte de partage + boutons « Partager » (téléphone) et « Télécharger ».
export function ShareCard({ id, title }: { id: number; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = `/critiques/${id}/carte`;
  const filename = `dreams-${title.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}.png`;

  const share = async () => {
    setBusy(true);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title });
      else window.open(url, "_blank");
    } catch {
      // partage annulé
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
      {open && <img src={url} alt={`Carte de partage : ${title}`} className="mx-auto mt-4 w-full max-w-sm rounded-xl shadow-2xl" />}
    </div>
  );
}
