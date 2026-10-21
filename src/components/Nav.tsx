"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Theme } from "@/lib/theme";
import { Logo } from "./Logo";
import { ThemeSwitch } from "./ThemeSwitch";

const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  films: "M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
};

// Barre du haut (ordinateur) et onglets du bas (mobile).
const DESKTOP = [
  { href: "/", label: "Accueil" },
  { href: "/films", label: "Films" },
  { href: "/conseils", label: "Conseils" },
  { href: "/critiques", label: "Critiques" },
  { href: "/agenda", label: "Agenda" },
  { href: "/stats", label: "Stats" },
];
const MOBILE = [
  { href: "/", label: "Accueil", icon: ICONS.home },
  { href: "/films", label: "Films", icon: ICONS.films },
  { href: "/conseils", label: "Conseils", icon: ICONS.star },
  { href: "/agenda", label: "Agenda", icon: ICONS.calendar },
  { href: "/stats", label: "Stats", icon: ICONS.chart },
];
// Ces pages sont des sous-onglets de « Films » (voir LibraryTabs).
const LIBRARY = ["/films", "/watchlist", "/collection", "/listes", "/personnes", "/personne", "/critiques"];

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function HeaderIcons({ alerts }: { alerts: number }) {
  return (
    <div className="flex items-center gap-1">
      <Link href="/recherche" className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-foreground" aria-label="Rechercher">
        <Icon d={ICONS.search} />
      </Link>
      <Link href="/alertes" className="relative flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-foreground" aria-label={`Au cinéma${alerts ? ` : ${alerts} nouvelle(s) alerte(s)` : ""}`}>
        <Icon d={ICONS.bell} />
        {alerts > 0 && (
          <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-on-accent">{alerts}</span>
        )}
      </Link>
    </div>
  );
}

export function Nav({ theme, alerts }: { theme: Theme; alerts: number }) {
  const path = usePathname();
  const active = (href: string) =>
    href === "/" ? path === "/" : href === "/films" ? LIBRARY.some((l) => path.startsWith(l)) : path.startsWith(href);
  const activeDesktop = (href: string) => (href === "/films" ? active(href) && !path.startsWith("/critiques") : active(href));

  return (
    <>
      {/* Ordinateur : barre en haut */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-background/85 backdrop-blur md:block">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-8">
          <Link href="/" aria-label="Dreams, accueil">
            <Logo />
          </Link>
          <div className="flex gap-0.5">
            {DESKTOP.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${activeDesktop(l.href) ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <HeaderIcons alerts={alerts} />
            <ThemeSwitch initial={theme} />
          </div>
        </nav>
      </header>

      {/* Mobile : logo + icônes en haut, onglets en bas comme une appli native */}
      <header className="flex items-center justify-between gap-2 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-2 md:hidden">
        <Link href="/" aria-label="Dreams, accueil">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <HeaderIcons alerts={alerts} />
          <ThemeSwitch initial={theme} />
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {MOBILE.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${active(l.href) ? "text-accent" : "text-muted"}`}
          >
            <Icon d={l.icon} />
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
