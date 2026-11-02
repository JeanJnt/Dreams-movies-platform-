/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";

// Aperçu des cartes de partage + boutons « Partager » (téléphone) et « Télécharger ».
// Une critique longue tient sur plusieurs cartes, partagées ensemble comme un carrousel.
export function ShareCard({ id, title, pages }: { id: number; title: string; pages: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const files = useRef<File[] | null>(null);
  const urls = Array.from({ length: pages }, (_, i) => `/critiques/${id}/carte?page=${i + 1}`);
  const base = `dreams-${title.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}`;
  const filename = (i: number) => (pages > 1 ? `${base}-${i + 1}.png` : `${base}.png`);

  const load = async () => {
    files.current ??= await Promise.all(
      urls.map(async (url, i) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Carte indisponible");
        return new File([await res.blob()], filename(i), { type: "image/png" });
      }),
    );
    return files.current;
  };

  const share = async () => {
    setBusy(true);
    setNote(null);
    try {
      const list = await load();
      if (navigator.canShare?.({ files: list })) await navigator.share({ files: list, title });
      else setOpen(true);
    } catch (e) {
      // Après un long chargement, le téléphone peut refuser le partage : les cartes sont gardées, un second toucher suffit.
      if ((e as Error).name === "NotAllowedError") setNote("Cartes prêtes : touche encore « Partager ».");
      else if ((e as Error).name !== "AbortError") setNote("Partage impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  // Plusieurs cartes : téléchargées l'une après l'autre (les navigateurs refusent plusieurs téléchargements simultanés).
  const downloadAll = async () => {
    setBusy(true);
    setNote(null);
    try {
      for (const file of await load()) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      setNote("Téléchargement impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display mr-auto">{pages > 1 ? `Cartes de partage · ${pages} images` : "Carte de partage"}</span>
        <button onClick={() => setOpen(!open)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">{open ? "Masquer" : "Aperçu"}</button>
        <button onClick={share} disabled={busy} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">{busy ? "…" : "Partager"}</button>
        {pages > 1 ? (
          <button onClick={downloadAll} disabled={busy} className="rounded-full bg-accent px-3 py-1.5 text-xs text-on-accent">Tout télécharger</button>
        ) : (
          <a href={urls[0]} download={filename(0)} className="rounded-full bg-accent px-3 py-1.5 text-xs text-on-accent">Télécharger</a>
        )}
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
      {open && (
        <div className="no-scrollbar mt-4 flex snap-x gap-3 overflow-x-auto">
          {urls.map((url, i) => (
            <img key={url} src={url} alt={`Carte de partage ${i + 1} sur ${pages} : ${title}`} loading="lazy" className={`mx-auto shrink-0 snap-center rounded-xl shadow-2xl ${pages > 1 ? "w-72" : "w-full max-w-sm"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
