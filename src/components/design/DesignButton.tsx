"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CaseFilmInfo } from "../three/dreams/CaseObject";

const DesignEditor = dynamic(
  () => import("./DesignEditor").then((m) => m.DesignEditor),
  { ssr: false },
);

// Ouvre l'atelier du boîtier et du disque (aussi par le lien « ?personnaliser » depuis la collection)
export function DesignButton({
  film,
  className = "btn",
}: {
  film: CaseFilmInfo;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  useEffect(() => {
    if (params.has("personnaliser")) setOpen(true);
  }, [params]);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.4" />
          <path d="M12 3v3M21 12h-3" strokeLinecap="round" />
        </svg>
        Personnaliser le boîtier et le disque
      </button>
      {/* rendu sur <body> : la page animée crée un contexte d'empilement qui le placerait sous la barre de navigation */}
      {open &&
        createPortal(
          <DesignEditor
            film={film}
            onClose={() => {
              setOpen(false);
              if (params.has("personnaliser"))
                window.history.replaceState(null, "", window.location.pathname);
            }}
          />,
          document.body,
        )}
    </>
  );
}
