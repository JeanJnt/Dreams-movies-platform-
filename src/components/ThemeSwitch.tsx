"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { THEMES, type Theme } from "@/lib/theme";

function Swatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex -space-x-1.5">
      {colors.map((c) => (
        <span key={c} className="size-4 rounded-full ring-2 ring-surface" style={{ background: c }} />
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
  const current = THEMES.find((t) => t.key === theme)!;

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    setOpen(false);
    document.documentElement.dataset.theme = t;
    // Barre d'état d'Android et barre de titre de l'appli installée aux couleurs du thème
    const bg = THEMES.find((x) => x.key === t)!.bar;
    document.querySelectorAll("meta[name=theme-color]").forEach((m) => m.setAttribute("content", bg));
    document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1.5 text-xs transition hover:border-accent"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Swatch colors={current.swatch} />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-muted">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-2xl shadow-black/40">
          <p className="px-3 pt-2 pb-1.5 text-[10px] uppercase tracking-[0.25em] text-muted">Thème inspiré de…</p>
          {THEMES.map((t) => (
            <button
              key={t.key}
              role="menuitemradio"
              aria-checked={t.key === theme}
              onClick={() => choose(t.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${t.key === theme ? "bg-surface-2" : "hover:bg-surface-2"}`}
            >
              <Swatch colors={t.swatch} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{t.film}</span>
                <span className="block text-xs text-muted">{t.director}, {t.year}</span>
              </span>
              {t.key === theme && <span className="text-accent">●</span>}
            </button>
          ))}
        <a href="/installer" className="mt-1 flex items-center gap-3 rounded-xl border-t border-border px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground">
          <span className="text-lg">⬇</span> Installer l&apos;appli (ordi, iPhone, Android)
        </a>
        </div>
      )}
    </div>
  );
}
