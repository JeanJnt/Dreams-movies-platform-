"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Rangée horizontale (affiches, cartes) : défilement au doigt ou au trackpad,
 * flèches sur ordinateur, fondu sur les bords et fine barre de progression.
 */
export function Rail({ children, className = "", label }: { children: React.ReactNode; className?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ start: true, end: false, progress: 0, ratio: 1 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({ start: el.scrollLeft < 4, end: el.scrollLeft > max - 4, progress: max > 0 ? el.scrollLeft / max : 0, ratio: el.scrollWidth ? el.clientWidth / el.scrollWidth : 1 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const btn = "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--dm-line-2)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] text-foreground shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] backdrop-blur-xl transition duration-200 hover:bg-surface-2 active:scale-95 md:flex";

  return (
    <div className={`group/rail relative ${className}`} role="region" aria-label={label}>
      <div ref={ref} onScroll={measure} className="no-scrollbar bleed flex snap-x gap-3 overflow-x-auto pb-4 md:gap-5 [&>*]:snap-start">
        {children}
      </div>
      <button onClick={() => page(-1)} aria-label="Précédents" className={`${btn} -left-5 ${state.start ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100"}`}>
        <svg viewBox="0 0 24 24" className="size-4 rotate-180" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden><path d="M9 6l6 6-6 6" /></svg>
      </button>
      <button onClick={() => page(1)} aria-label="Suivants" className={`${btn} -right-5 ${state.end ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100"}`}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden><path d="M9 6l6 6-6 6" /></svg>
      </button>
      {state.ratio < 0.98 && (
        <div className="relative mt-2 hidden h-[3px] w-40 overflow-hidden rounded-full bg-[var(--dm-line)] md:block" aria-hidden>
          <div
            className="absolute inset-y-0 rounded-full bg-foreground/70 transition-[left] duration-150"
            style={{ width: `${Math.max(12, state.ratio * 100)}%`, left: `${state.progress * (100 - Math.max(12, state.ratio * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
