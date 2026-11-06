"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

/*
 * Sommaire d'une longue page (fiche film) : il reste collé en haut, montre le chapitre en cours
 * et y emmène en douceur. Seuls les chapitres présents sur la page sont listés.
 */
export function ChapterNav({ chapters }: { chapters: { id: string; label: string }[] }) {
  const [present, setPresent] = useState(chapters);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const found = chapters.filter((c) => document.getElementById(c.id));
    setPresent(found);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    found.forEach((c) => io.observe(document.getElementById(c.id)!));
    return () => io.disconnect();
  }, [chapters]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (present.length < 3) return null;
  return (
    <nav aria-label="Sur cette page" className="dm-top sticky top-0 z-30 -mx-[var(--gutter)] px-[var(--gutter)] transition-[top] duration-300 ease-[cubic-bezier(.23,1,.32,1)] md:top-[var(--nav-offset,4rem)]">
      <div className="no-scrollbar flex gap-1 overflow-x-auto py-2">
        {present.map((c) => (
          <button
            key={c.id}
            onClick={() => go(c.id)}
            aria-current={current === c.id ? "true" : undefined}
            className={`relative min-h-10 shrink-0 rounded-full px-4 text-[14px] transition-colors duration-150 ${current === c.id ? "text-background" : "text-muted hover:text-foreground"}`}
          >
            {current === c.id && <motion.span layoutId="chapter-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }} />}
            <span className="relative">{c.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
