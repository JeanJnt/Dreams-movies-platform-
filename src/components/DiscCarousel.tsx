/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscLabel, type DiscData } from "./DiscLabel";
import { Stars } from "./Stars";

export type Disc = DiscData & {
  href: string;
  rating?: number | null;
};

// Un disque : l'étiquette imprimée (voir DiscLabel) + le reflet irisé d'un vrai DVD.
function DiscFace({ disc, spinning }: { disc: Disc; spinning: boolean }) {
  return (
    <div className="disc relative aspect-square w-full rounded-full">
      <div className={`absolute inset-0 ${spinning ? "disc--spin" : ""}`}>
        <DiscLabel disc={disc} />
      </div>
      <div className="disc-sheen absolute inset-0 rounded-full" />
    </div>
  );
}

export function DiscCarousel({ discs, label }: { discs: Disc[]; label?: string }) {
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0); // décalage pendant qu'on fait glisser
  const start = useRef<{ x: number; moved: boolean } | null>(null);
  const n = discs.length;

  const go = useCallback((i: number) => setActive(Math.max(0, Math.min(n - 1, i))), [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") go(active + 1);
      if (e.key === "ArrowLeft") go(active - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go]);

  if (!n) return null;
  const current = discs[active];
  const pos = active - drag;
  const release = () => {
    if (start.current?.moved) go(Math.round(active - drag));
    setDrag(0);
    setTimeout(() => (start.current = null));
  };

  return (
    <section aria-label={label ?? "Carrousel de disques"} className="relative select-none">
      {/* L'image du disque sélectionné, floutée en fond, comme une lumière de salle */}
      {current.image && (
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-[460px] overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_72%)] md:block">
          <img key={current.image} src={current.image} alt="" className="size-full scale-125 object-cover opacity-30 blur-3xl transition-opacity duration-700" />
        </div>
      )}

      <div
        className="relative h-[300px] touch-pan-y overflow-hidden md:h-[460px]"
        style={{ perspective: "1400px" }}
        onPointerDown={(e) => (start.current = { x: e.clientX, moved: false })}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          if (Math.abs(dx) > 5) start.current.moved = true;
          setDrag(dx / 160);
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) go(active + Math.sign(e.deltaX));
        }}
      >
        {discs.map((d, i) => {
          const offset = i - pos;
          if (Math.abs(offset) > 5) return null;
          // Les disques sont posés sur un arc : ils s'éloignent, pivotent et s'assombrissent vers les bords.
          const x = offset * 52;
          const z = -Math.abs(offset) * 170;
          const rotate = offset * -30;
          const isActive = i === active && !drag;
          return (
            <button
              key={d.id}
              onClick={() => {
                if (start.current?.moved) return;
                if (i !== active) go(i);
              }}
              tabIndex={i === active ? 0 : -1}
              aria-label={d.title}
              className="absolute top-1/2 left-1/2 w-[220px] md:w-[360px]"
              style={{
                transform: `translate(-50%, -50%) translateX(${x}%) translateZ(${z}px) rotateY(${rotate}deg)`,
                zIndex: 100 - Math.round(Math.abs(offset) * 10),
                opacity: Math.max(0, 1 - Math.abs(offset) * 0.16),
                transition: drag ? "none" : "transform 0.8s cubic-bezier(.2,.8,.2,1), opacity 0.5s, filter 0.5s",
                filter: Math.abs(offset) > 0.5 ? `brightness(${1 - Math.min(0.55, Math.abs(offset) * 0.18)})` : undefined,
              }}
            >
              <DiscFace disc={d} spinning={isActive} />
            </button>
          );
        })}
      </div>

      {/* Infos du disque sélectionné */}
      <div className="relative mx-auto -mt-1 max-w-xl text-center">
        <p className="text-[11px] tracking-[0.35em] text-muted uppercase tabular-nums">
          {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          {current.badge && <> · <span className="text-accent">{current.badge}</span></>}
        </p>
        <Link href={current.href} className="font-display mt-2 block text-4xl leading-none transition hover:text-accent md:text-6xl">
          {current.title}
        </Link>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
          {current.rating != null && <Stars rating={current.rating} />}
          <span>{[current.director, current.year].filter(Boolean).join(" · ")}</span>
        </p>
        {/* Sur téléphone on fait glisser les disques et on touche le titre ; les flèches ne servent qu'à la souris */}
        <div className="mt-5 hidden items-center justify-center gap-3 md:flex">
          <button onClick={() => go(active - 1)} disabled={active === 0} className="flex size-11 items-center justify-center rounded-full border border-border bg-surface transition hover:border-accent disabled:opacity-30" aria-label="Disque précédent">←</button>
          <button onClick={() => go(active + 1)} disabled={active === n - 1} className="flex size-11 items-center justify-center rounded-full border border-border bg-surface transition hover:border-accent disabled:opacity-30" aria-label="Disque suivant">→</button>
        </div>
      </div>
    </section>
  );
}
