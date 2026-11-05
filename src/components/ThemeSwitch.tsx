"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { THEMES, type Theme } from "@/lib/theme";
import { applyTheme } from "@/lib/theme-client";

function Swatch({ colors, size = "size-4" }: { colors: readonly string[]; size?: string }) {
  return (
    <span className="flex -space-x-1.5">
      {colors.map((c) => (
        <span key={c} className={`${size} rounded-full ring-2 ring-surface`} style={{ background: c }} />
      ))}
    </span>
  );
}

// Menu des thèmes, chacun inspiré d'un film. Le choix est gardé dans un cookie (1 an).
export function ThemeSwitch({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const current = THEMES.find((t) => t.key === theme) ?? THEMES[0];

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    setOpen(false);
    applyTheme(t);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface/60 pr-3 pl-1.5 text-xs transition hover:border-accent/60"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Thème : ${current.label}`}
      >
        <Swatch colors={current.swatch} />
        <span className="hidden lg:inline">{current.label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="card glass absolute right-0 z-50 mt-3 w-[min(21rem,calc(100vw-2rem))] origin-top-right !rounded-2xl p-2 shadow-2xl shadow-black/50"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow px-3 pt-2 pb-2.5">Un thème, un film</p>
            <div className="max-h-[65vh] overflow-y-auto" data-lenis-prevent>
              {THEMES.map((t, i) => (
                <button
                  key={t.key}
                  role="menuitemradio"
                  aria-checked={t.key === theme}
                  onClick={() => choose(t.key)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${t.key === theme ? "bg-surface-2" : "hover:bg-surface-2/70"}`}
                >
                  {/* Une petite affiche aux couleurs du thème */}
                  <span
                    className="relative flex h-11 w-9 shrink-0 items-end overflow-hidden rounded-md p-1 ring-1 ring-white/10 transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105"
                    style={{ background: `linear-gradient(160deg, ${t.swatch[0]} 0 55%, ${t.swatch[1]} 55% 78%, ${t.swatch[2]} 78%)` }}
                  >
                    <span className="font-mono text-[8px] leading-none" style={{ color: t.swatch[2] === "#0b0b0b" || t.swatch[2] === "#050505" ? "#fff" : t.swatch[0] }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.film}</span>
                    <span className="block truncate text-xs text-muted">
                      {t.director}
                      {t.key !== "nitrate" && <span className="font-mono"> · {t.year}</span>}
                    </span>
                  </span>
                  {t.key === theme && <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
