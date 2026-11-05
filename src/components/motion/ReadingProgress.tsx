"use client";

import { useEffect, useRef } from "react";

// Fine barre de lecture en haut de l'écran : où l'on en est d'un long texte.
export function ReadingProgress({ target }: { target: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.querySelector(target);
    if (!el || !bar.current) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      bar.current!.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [target]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[65] h-[2px]">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-accent shadow-[0_0_10px_var(--accent)]" />
    </div>
  );
}
