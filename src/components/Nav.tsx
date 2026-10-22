"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/theme";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";
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
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  back: "M15 18l-6-6 6-6",
  close: "M6 6l12 12M18 6L6 18",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  disc: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
};

// Ordinateur : une seule rangée de liens, sobre.
const DESKTOP = [
  { href: "/", label: "Accueil" },
  { href: "/films", label: "Films" },
  { href: "/conseils", label: "Conseils" },
  { href: "/critiques", label: "Critiques" },
  { href: "/agenda", label: "Agenda" },
  { href: "/activite", label: "Communauté" },
];
// Mobile : 4 onglets + « Plus », comme une appli native.
const MOBILE = [
  { href: "/", label: "Accueil", icon: ICONS.home },
  { href: "/films", label: "Films", icon: ICONS.films },
  { href: "/recherche", label: "Chercher", icon: ICONS.search },
  { href: "/conseils", label: "Conseils", icon: ICONS.star },
];
// Tout le reste, dans le panneau « Plus » (mobile)
const MORE = [
  { href: "/critiques", label: "Critiques", icon: ICONS.pen },
  { href: "/agenda", label: "Agenda", icon: ICONS.calendar },
  { href: "/alertes", label: "Au cinéma", icon: ICONS.bell },
  { href: "/stats", label: "Stats", icon: ICONS.chart },
  { href: "/watchlist", label: "Watchlist", icon: ICONS.bookmark },
  { href: "/listes", label: "Listes", icon: ICONS.list },
  { href: "/preferes", label: "Préférés", icon: ICONS.star },
  { href: "/collection", label: "Collection", icon: ICONS.disc },
  { href: "/activite", label: "Communauté", icon: ICONS.people },
  { href: "/compte", label: "Mon compte", icon: ICONS.user },
  { href: "/installer", label: "Installer", icon: ICONS.download },
];
// Les pages « racines » des onglets du bas : ailleurs, on affiche une flèche de retour.
const ROOTS = ["/", "/films", "/recherche", "/conseils"];
// Pages rangées sous « Films » et sous « Communauté »
const LIBRARY = ["/films", "/watchlist", "/collection", "/listes", "/personnes", "/personne"];
const COMMUNITY = ["/activite", "/membres", "/membre"];

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

type NavUser = { name: string; isAdmin: boolean };

function Bell({ alerts }: { alerts: number }) {
  return (
    <Link href="/alertes" className="relative flex size-9 items-center justify-center rounded-full text-muted transition hover:text-foreground" aria-label={`Au cinéma${alerts ? ` : ${alerts} nouvelle(s) alerte(s)` : ""}`}>
      <Icon d={ICONS.bell} />
      {alerts > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent ring-2 ring-background" />}
    </Link>
  );
}

function Avatar({ user }: { user: NavUser }) {
  return (
    <Link href="/compte" className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent" title={`${user.name} · mon compte`} aria-label="Mon compte">
      {user.name.slice(0, 1).toUpperCase()}
    </Link>
  );
}

// Retour en arrière : la page précédente de l'appli, sinon l'accueil (appli ouverte directement sur une page).
function useGoBack() {
  const router = useRouter();
  return useCallback(() => (window.history.length > 1 ? router.back() : router.push("/")), [router]);
}

export function Nav({ theme, alerts, user }: { theme: Theme; alerts: number; user: NavUser }) {
  const path = usePathname();
  const goBack = useGoBack();
  const [more, setMore] = useState(false);
  const isRoot = ROOTS.includes(path);
  useEffect(() => setMore(false), [path]);

  // Sur téléphone : glisser depuis le bord gauche de l'écran vers la droite = retour (comme une appli native).
  useEffect(() => {
    if (isRoot) return;
    let start: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      start = t.clientX < 28 && window.innerWidth < 768 ? { x: t.clientX, y: t.clientY } : null;
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      if (t.clientX - start.x > 70 && Math.abs(t.clientY - start.y) < 60) goBack();
      start = null;
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchend", up, { passive: true });
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchend", up);
    };
  }, [isRoot, goBack]);

  // Panneau « Plus » : on le ferme en le faisant glisser vers le bas
  const sheetStart = useRef<number | null>(null);

  const active = (href: string) =>
    href === "/" ? path === "/" : href === "/films" ? LIBRARY.some((l) => path.startsWith(l)) : href === "/activite" ? COMMUNITY.some((l) => path.startsWith(l)) : path.startsWith(href);
  const moreActive = MORE.some((l) => path.startsWith(l.href)) && !MOBILE.some((l) => active(l.href));

  return (
    <>
      {/* Ordinateur : logo, liens, recherche avec suggestions, alertes, compte, thème */}
      <header className="sticky top-0 z-30 hidden bg-background/80 backdrop-blur-xl md:block">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-8">
          <Link href="/" aria-label="Dreams, accueil" className="shrink-0">
            <Logo />
          </Link>
          <div className="flex h-full items-center gap-6">
            {DESKTOP.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex h-full items-center text-sm transition-colors ${active(l.href) ? "font-medium text-foreground" : "text-muted hover:text-foreground"}`}
              >
                {l.label}
                {active(l.href) && <span className="absolute inset-x-0 bottom-3 h-0.5 rounded-full bg-accent" />}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-56 lg:w-64">
              <SearchBox compact key={path} />
            </div>
            <Bell alerts={alerts} />
            <Avatar user={user} />
            <ThemeSwitch initial={theme} />
          </div>
        </nav>
      </header>

      {/* Mobile : logo en haut, onglets en bas */}
      <header className="flex items-center justify-between gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2 md:hidden">
        {isRoot ? (
          <Link href="/" aria-label="Dreams, accueil">
            <Logo />
          </Link>
        ) : (
          <button onClick={goBack} className="-ml-2 flex items-center gap-0.5 rounded-full py-1.5 pr-3 pl-1 text-sm text-foreground" aria-label="Retour">
            <Icon d={ICONS.back} className="size-6" />
            Retour
          </button>
        )}
        <div className="flex items-center gap-1">
          <Bell alerts={alerts} />
          <ThemeSwitch initial={theme} />
        </div>
      </header>

      {more && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] grid grid-cols-3 gap-1 rounded-3xl border border-border bg-surface p-3 pt-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => (sheetStart.current = e.touches[0].clientY)}
            onTouchEnd={(e) => {
              if (sheetStart.current != null && e.changedTouches[0].clientY - sheetStart.current > 50) setMore(false);
              sheetStart.current = null;
            }}
          >
            <span className="absolute top-2.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border" aria-hidden />
            <button onClick={() => setMore(false)} className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full text-muted" aria-label="Fermer">
              <Icon d={ICONS.close} className="size-4" />
            </button>
            {MORE.map((l) => (
              <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs ${path.startsWith(l.href) ? "bg-surface-2 text-accent" : "text-foreground"}`}>
                <Icon d={l.icon} />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {MOBILE.map((l) => (
          <Link key={l.href} href={l.href} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${active(l.href) && !more ? "text-accent" : "text-muted"}`}>
            <Icon d={l.icon} />
            {l.label}
          </Link>
        ))}
        <button onClick={() => setMore(!more)} aria-expanded={more} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${more || moreActive ? "text-accent" : "text-muted"}`}>
          <Icon d={ICONS.more} className="size-5" />
          Plus
        </button>
      </nav>
    </>
  );
}
