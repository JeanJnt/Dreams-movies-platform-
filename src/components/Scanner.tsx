/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { addScannedAction, lookupBarcodeAction, searchFilmsAction } from "@/app/actions";
import type { FilmCandidate, ProductGuess } from "@/lib/barcode";
import { DvdCase } from "./DvdCase";

type Props = { formats: readonly string[]; caseTypes: readonly { key: string; label: string }[] };

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs transition ${active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"}`;

// Scanner : on vise le code-barres du boîtier avec la caméra, on confirme le film, et il rejoint la collection.
export function Scanner({ formats, caseTypes }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"off" | "on" | "error">("off");
  const [product, setProduct] = useState<ProductGuess | null>(null);
  const [candidates, setCandidates] = useState<FilmCandidate[]>([]);
  const [chosen, setChosen] = useState<FilmCandidate | null>(null);
  const [query, setQuery] = useState("");
  const [manualEan, setManualEan] = useState("");
  const [added, setAdded] = useState<{ id: number; title: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const stopRef = useRef<(() => void) | null>(null);

  const handleCode = (ean: string) =>
    startTransition(async () => {
      stopRef.current?.();
      setCamera("off");
      const res = await lookupBarcodeAction(ean);
      setProduct(res.product);
      setQuery(res.product.query);
      setCandidates(res.candidates);
      setChosen(res.candidates[0] ?? null);
    });

  const startCamera = async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      setCamera("on");
      const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, video.current!, (result) => {
        if (result) handleCode(result.getText());
      });
      stopRef.current = () => controls.stop();
    } catch {
      setCamera("error");
    }
  };

  useEffect(() => () => stopRef.current?.(), []);

  const reset = () => {
    setProduct(null);
    setCandidates([]);
    setChosen(null);
    setQuery("");
  };

  const add = () =>
    chosen &&
    product &&
    startTransition(async () => {
      const id = await addScannedAction(chosen.tmdbId, {
        format: product.format,
        caseType: product.caseType,
        edition: product.edition,
        cover: product.cover,
        ean: product.ean || null,
      });
      setAdded((a) => [{ id, title: chosen.title }, ...a]);
      reset();
    });

  return (
    <div className="space-y-6">
      {!product && (
        <div className="space-y-4">
          <div className="relative mx-auto aspect-[4/3] max-w-xl overflow-hidden rounded-3xl border border-border bg-black">
            <video ref={video} className="size-full object-cover" muted playsInline />
            {camera === "on" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-1/3 w-3/4 rounded-xl border-2 border-accent shadow-[0_0_0_999px_#0008]">
                  <div className="scan-line h-0.5 w-full bg-accent" />
                </div>
              </div>
            )}
            {camera !== "on" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                <p className="font-display text-2xl">Vise le code-barres du boîtier</p>
                <button onClick={startCamera} className="font-display rounded-full bg-accent px-6 py-2.5 text-on-accent">📷 Activer la caméra</button>
                {camera === "error" && <p className="text-sm text-white/70">Caméra indisponible. Sur téléphone, l&apos;appli doit être ouverte en HTTPS (une fois en ligne).</p>}
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{8,14}$/.test(manualEan)) handleCode(manualEan);
            }}
            className="mx-auto flex max-w-xl gap-2"
          >
            <input value={manualEan} onChange={(e) => setManualEan(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="…ou tape les chiffres du code-barres" className="field flex-1" />
            <button className="rounded-lg border border-border px-4 text-sm">OK</button>
          </form>
          <p className="text-center text-sm text-muted">
            Pas de code-barres ?{" "}
            <button
              onClick={() => {
                setProduct({ ean: "", productTitle: null, query: "", format: "Blu-ray", caseType: "amaray", edition: null, cover: null });
              }}
              className="text-accent hover:underline"
            >
              Ajouter à la main
            </button>
          </p>
        </div>
      )}

      {pending && !product && <p className="text-center text-muted">Recherche de l&apos;édition…</p>}

      {product && (
        <div className="mx-auto max-w-2xl space-y-5 rounded-3xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-wider text-muted uppercase">{product.ean ? `Code ${product.ean}` : "Ajout manuel"}</p>
              <p className="font-display mt-1 text-xl">{product.productTitle ?? (product.ean ? "Édition inconnue de la base" : "Quel film ?")}</p>
            </div>
            <button onClick={reset} className="text-sm text-muted hover:text-foreground">Recommencer</button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const c = await searchFilmsAction(query);
                setCandidates(c);
                setChosen(c[0] ?? null);
              });
            }}
            className="flex gap-2"
          >
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre du film" className="field flex-1" />
            <button className="rounded-lg border border-border px-4 text-sm">Chercher</button>
          </form>

          {candidates.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {candidates.map((c) => (
                <button key={c.tmdbId} onClick={() => setChosen(c)} className={`text-left ${chosen?.tmdbId === c.tmdbId ? "" : "opacity-60 hover:opacity-100"}`}>
                  <div className={`aspect-[2/3] overflow-hidden rounded-md bg-surface-2 ring-2 ${chosen?.tmdbId === c.tmdbId ? "ring-accent" : "ring-transparent"}`}>
                    {c.poster && <img src={c.poster} alt="" className="size-full object-cover" />}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs">{c.title}</p>
                  <p className="text-[11px] text-muted">{c.year}</p>
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            {chosen && (
              <DvdCase
                compact
                film={{ id: chosen.tmdbId, href: "#", title: chosen.title, year: chosen.year, director: null, runtime: null, image: null, cover: product.cover ?? chosen.poster, format: product.format, caseType: product.caseType }}
              />
            )}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {formats.map((f) => <button key={f} onClick={() => setProduct({ ...product, format: f })} className={chip(product.format === f)}>{f}</button>)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {caseTypes.map((c) => <button key={c.key} onClick={() => setProduct({ ...product, caseType: c.key })} className={chip(product.caseType === c.key)}>{c.label}</button>)}
              </div>
              <input value={product.edition ?? ""} onChange={(e) => setProduct({ ...product, edition: e.target.value || null })} placeholder="Édition (Criterion, Carlotta…)" className="field w-full" />
            </div>
          </div>

          <button onClick={add} disabled={!chosen || pending} className="font-display w-full rounded-full bg-accent py-3 text-on-accent disabled:opacity-40">
            {chosen ? `Ajouter « ${chosen.title} » à ma collection` : "Choisis le film"}
          </button>
        </div>
      )}

      {added.length > 0 && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-border p-4 text-sm">
          <p className="mb-2 text-muted">Ajoutés pendant cette session :</p>
          {added.map((a) => (
            <Link key={a.id} href={`/film/${a.id}`} className="block py-0.5 hover:text-accent">✓ {a.title}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
