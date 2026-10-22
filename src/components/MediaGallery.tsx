/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState, useTransition } from "react";
import { addMediaAction, deleteMediaAction, registerMediaAction, setMediaVisibilityAction } from "@/app/actions";
import { sendFile } from "@/lib/upload-client";
import type { Media } from "@/lib/media";

export function MediaGallery({ filmId, media }: { filmId: number; media: Media[] }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<Media | null>(null);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  const submit = (data: FormData) =>
    startTransition(async () => {
      try {
        // En ligne, les fichiers partent directement vers le stockage (même les grosses vidéos) ;
        // en local, ils passent par le formulaire classique.
        const files = data.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
        const caption = String(data.get("caption") ?? "").trim() || null;
        const visibility = data.get("visibility") === "prive" ? "prive" : "membres";
        const remaining: File[] = [];
        for (const [i, file] of files.entries()) {
          const sent = await sendFile(file, filmId, "media", (pct) => setProgress(`Envoi ${i + 1}/${files.length} : ${pct} %`));
          if (sent) await registerMediaAction(filmId, sent.name, caption, visibility);
          else remaining.push(file);
        }
        data.delete("files");
        remaining.forEach((f) => data.append("files", f));
        if (remaining.length || data.get("youtube")) {
          const res = await addMediaAction(filmId, data);
          if (res.error) throw new Error(res.error);
        } else if (!files.length) {
          throw new Error("Choisis un fichier ou colle un lien YouTube.");
        }
        setError(null);
        form.current?.reset();
        setAdding(false);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setProgress(null);
      }
    });

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-3xl">Galerie</h2>
        <button onClick={() => setAdding(!adding)} className="text-sm text-muted hover:text-accent">
          {adding ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {adding && (
        <form ref={form} action={submit} className="mb-6 space-y-3 rounded-xl border border-border bg-surface p-4">
          <label className="block cursor-pointer rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted hover:border-accent">
            📁 Choisir des images ou des vidéos
            <input name="files" type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" className="mt-2 block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-foreground" />
          </label>
          <input name="youtube" placeholder="…ou colle un lien YouTube" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="visibility" value="membres" defaultChecked /> 👥 Visible des membres</label>
            <label className="flex items-center gap-2"><input type="radio" name="visibility" value="prive" /> 🔒 Rien que pour moi</label>
          </div>
          <input name="caption" placeholder="Légende (facultatif)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
          {error && <p className="text-sm text-heart">{error}</p>}
          <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-50">
            {pending ? (progress ?? "Envoi en cours…") : "Ajouter à la galerie"}
          </button>
        </form>
      )}

      {media.length === 0 && !adding ? (
        <p className="text-sm text-muted">Ajoute tes captures préférées, photos de ton Blu-ray, extraits vidéo…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {media.map((m) => (
            <figure key={m.id} className="group relative">
              <div className="aspect-video overflow-hidden rounded-lg bg-surface-2">
                {m.kind === "image" && (
                  <button onClick={() => setZoom(m)} className="size-full">
                    <img src={m.url} alt={m.caption ?? ""} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                  </button>
                )}
                {m.kind === "video" && <video src={m.url} controls preload="metadata" className="size-full bg-black object-contain" />}
                {m.kind === "youtube" && <iframe src={m.url} title={m.caption ?? "Vidéo"} allowFullScreen loading="lazy" className="size-full" />}
              </div>
              <figcaption className="mt-1 flex items-center gap-2 text-xs text-muted">
                <span className="truncate">{m.caption}</span>
                <span className="ml-auto shrink-0">{m.mine ? (m.visibility === "prive" ? "🔒 moi" : "👥 moi") : m.author}</span>
              </figcaption>
              {m.mine && (
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <button
                onClick={() => startTransition(() => setMediaVisibilityAction(m.id, filmId, m.visibility === "prive" ? "membres" : "prive"))}
                className="rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                title={m.visibility === "prive" ? "Partager avec les membres" : "Rendre privé"}
              >
                {m.visibility === "prive" ? "🔒" : "👥"}
              </button>
              <button
                onClick={() => confirm("Retirer ce média de la galerie ?") && startTransition(() => deleteMediaAction(m.id))}
                className="rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                aria-label="Supprimer"
              >
                ✕
              </button>
              </div>
              )}
            </figure>
          ))}
        </div>
      )}

      {/* Visionneuse plein écran pour les images */}
      {zoom && (
        <button onClick={() => setZoom(null)} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4" aria-label="Fermer">
          <img src={zoom.url} alt={zoom.caption ?? ""} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          {zoom.caption && <p className="mt-3 text-sm text-white/80">{zoom.caption}</p>}
        </button>
      )}
    </section>
  );
}
