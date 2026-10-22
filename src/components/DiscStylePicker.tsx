"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { setDiscStyleAction } from "@/app/actions";
import { DISC_LAYOUTS, DiscLabel, type DiscData } from "./DiscLabel";

const LABELS: Record<string, string> = {
  auto: "Auto",
  photo: "Photo",
  bande: "Bande",
  typo: "Typo",
  duo: "Bichromie",
};

// Le disque du film (en haut de la fiche) : en le touchant, on choisit sa maquette, vue directement sur ce film.
export function DiscStylePicker({
  disc,
  filmId,
}: {
  disc: DiscData;
  filmId: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>(disc.variant ?? "auto");
  const [, start] = useTransition();

  const choose = (v: string) => {
    setCurrent(v);
    setOpen(false);
    start(async () => {
      await setDiscStyleAction(filmId, v === "auto" ? null : v);
      router.refresh();
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block size-full"
        aria-label="Choisir l'habillage du disque"
      >
        <DiscLabel
          disc={{ ...disc, variant: current === "auto" ? null : current }}
        />
      </button>

      {/* Le panneau est rendu à la racine de la page : le disque qui tourne le couperait sinon */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-t-3xl border border-border bg-surface p-5 md:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg">Habillage du disque</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="flex size-9 items-center justify-center rounded-full text-muted"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
              <div className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-1">
                {["auto", ...DISC_LAYOUTS].map((v) => (
                  <button
                    key={v}
                    onClick={() => choose(v)}
                    className="w-28 shrink-0 snap-start text-center"
                  >
                    <span
                      className={`relative block aspect-square rounded-full ${current === v ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                    >
                      <DiscLabel
                        disc={{ ...disc, variant: v === "auto" ? null : v }}
                      />
                    </span>
                    <span
                      className={`mt-2 block text-sm ${current === v ? "text-accent" : "text-muted"}`}
                    >
                      {LABELS[v]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
