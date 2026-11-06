"use client";

import { useEffect, useState } from "react";

/*
 * Les deux thèmes de Dreams : « Noir et blanc » (argent, par défaut) et « Noir et rouge » (rouge vif).
 * Seuls la couleur d'action et les repères changent ; tout le reste est identique.
 * Le choix est gardé dans un cookie (1 an), lu par le serveur : la page s'affiche directement dans le bon thème.
 */
export type ThemeKey = "argent" | "rouge";
export const THEMES: { key: ThemeKey; label: string; swatch: string }[] = [
  { key: "argent", label: "Noir et blanc", swatch: "linear-gradient(135deg,#000 50%,#ecebe7 50%)" },
  { key: "rouge", label: "Noir et rouge", swatch: "linear-gradient(135deg,#000 50%,#ff1f2e 50%)" },
];

export function applyTheme(t: ThemeKey) {
  document.cookie = `dm-theme=${t}; path=/; max-age=31536000; samesite=lax`;
  if (t === "rouge") document.documentElement.dataset.theme = "rouge";
  else delete document.documentElement.dataset.theme;
  // l'icône de l'onglet et de l'écran d'accueil change tout de suite
  const r = t === "rouge" ? "-rouge" : "";
  document.querySelectorAll<HTMLLinkElement>("link[rel~=icon]").forEach((l) => {
    l.href = l.type === "image/svg+xml" ? `/brand/icone${r}.svg` : `/icon-192${r}.png`;
  });
  document.querySelectorAll<HTMLLinkElement>("link[rel=apple-touch-icon]").forEach((l) => (l.href = `/apple-icon${r}.png`));
  document.querySelectorAll<HTMLLinkElement>("link[rel=manifest]").forEach((l) => (l.href = `/manifest.webmanifest?t=${t}`));
}

export function ThemeChoice({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeKey>("argent");
  useEffect(() => setTheme(document.documentElement.dataset.theme === "rouge" ? "rouge" : "argent"), []);
  return (
    <div role="radiogroup" aria-label="Thème" className={`flex gap-1.5 ${compact ? "" : "flex-wrap"}`}>
      {THEMES.map((t) => (
        <button
          key={t.key}
          role="radio"
          aria-checked={theme === t.key}
          onClick={() => {
            setTheme(t.key);
            applyTheme(t.key);
          }}
          className={`flex min-h-10 flex-1 items-center gap-2.5 rounded-full px-3.5 text-[13.5px] whitespace-nowrap transition-colors ${theme === t.key ? "bg-white/[0.1] text-foreground ring-1 ring-[var(--line-3)]" : "text-muted ring-1 ring-[var(--line)] hover:text-foreground"}`}
        >
          <span className="size-4 shrink-0 rounded-full ring-1 ring-white/30" style={{ background: t.swatch }} aria-hidden />
          {t.label}
        </button>
      ))}
    </div>
  );
}
