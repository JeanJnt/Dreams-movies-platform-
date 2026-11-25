"use client";

import { useEffect, useState } from "react";
import { APP_ICONS, appIconSuffix, iconChoiceFrom, themeAttr, themeFrom, THEMES, type IconChoice, type ThemeKey } from "@/lib/themes";

const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
const setCookie = (name: string, value: string) => (document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`);

// L'icône de l'onglet et de l'écran d'accueil change tout de suite (thème ou choix d'icône), et le manifeste est relu
function refreshIcons() {
  const theme = themeFrom(cookie("dm-theme"));
  const choice = iconChoiceFrom(cookie("dm-icon"));
  const r = appIconSuffix(theme, choice);
  document.querySelectorAll<HTMLLinkElement>("link[rel~=icon]").forEach((l) => {
    l.href = l.type === "image/svg+xml" ? `/brand/icone${r}.svg` : `/icon-192${r}.png`;
  });
  document.querySelectorAll<HTMLLinkElement>("link[rel=apple-touch-icon]").forEach((l) => (l.href = `/apple-icon${r}.png`));
  document.querySelectorAll<HTMLLinkElement>("link[rel=manifest]").forEach((l) => (l.href = `/manifest.webmanifest?t=${theme}&i=${choice}`));
}

// Le choix du thème (voir lib/themes.ts) : gardé dans un cookie (1 an), lu par le serveur.
export function applyTheme(t: ThemeKey) {
  setCookie("dm-theme", t);
  const attr = themeAttr(t);
  if (attr) document.documentElement.dataset.theme = attr;
  else delete document.documentElement.dataset.theme;
  refreshIcons();
}

export function ThemeChoice({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeKey>("argent");
  useEffect(() => setTheme(themeFrom(document.documentElement.dataset.theme)), []);
  return (
    <div role="radiogroup" aria-label="Thème" className={`flex gap-1.5 ${compact ? "" : "flex-wrap"}`}>
      {THEMES.map((t) => (
        <button
          key={t.key}
          role="radio"
          aria-label={t.label}
          aria-checked={theme === t.key}
          onClick={() => {
            setTheme(t.key);
            applyTheme(t.key);
          }}
          className={`flex min-h-10 flex-1 items-center gap-2.5 rounded-full px-3.5 text-[13.5px] whitespace-nowrap transition-colors ${theme === t.key ? "bg-white/[0.1] text-foreground ring-1 ring-[var(--line-3)]" : "text-muted ring-1 ring-[var(--line)] hover:text-foreground"}`}
        >
          <span className="size-4 shrink-0 rounded-full ring-1 ring-white/30" style={{ background: t.swatch }} aria-hidden />
          {/* dans le menu du profil, la place manque pour les noms complets */}
          {compact ? t.short : t.label}
        </button>
      ))}
    </div>
  );
}

// Le choix de l'icône de l'appli : « Comme le thème », ou un logo précis, quel que soit le thème.
export function IconChoicePicker() {
  const [choice, setChoice] = useState<IconChoice>("auto");
  const [theme, setTheme] = useState<ThemeKey>("argent");
  useEffect(() => {
    setChoice(iconChoiceFrom(cookie("dm-icon")));
    setTheme(themeFrom(document.documentElement.dataset.theme));
  }, []);
  const options: { key: IconChoice; label: string; suffix: string }[] = [
    { key: "auto", label: "Comme le thème", suffix: appIconSuffix(theme, "auto") },
    ...APP_ICONS.map((i) => ({ key: i.key, label: i.label, suffix: appIconSuffix(theme, i.key) })),
  ];
  return (
    <div role="radiogroup" aria-label="Icône de l'appli" className="grid grid-cols-4 gap-3 sm:max-w-md">
      {options.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={choice === o.key}
          onClick={() => {
            setChoice(o.key);
            setCookie("dm-icon", o.key);
            refreshIcons();
          }}
          className="group flex flex-col items-center gap-2 text-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/icon-192${o.suffix}.png`}
            alt=""
            className={`aspect-square w-full rounded-[22%] transition ${choice === o.key ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-black" : "opacity-70 ring-1 ring-[var(--line-2)] group-hover:opacity-100"}`}
          />
          <span className={`text-[12.5px] leading-tight ${choice === o.key ? "text-foreground" : "text-muted"}`}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
