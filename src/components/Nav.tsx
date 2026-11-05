"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "@/lib/theme";
import { CommandPalette, openPalette } from "./CommandPalette";
import { Logo } from "./Logo";
import { ThemeSwitch } from "./ThemeSwitch";

export const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  films: "M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9",
  more: "M4 7h16M4 12h16M4 17h10",
  back: "M15 18l-6-6 6-6",
  close: "M6 6l12 12M18 6L6 18",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  disc: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z",
};

const EASE = [0.16, 1, 0.3, 1] as const;

// Ordinateur : les grandes rubriques ; tout le reste est dans le menu du compte et la palette (⌘K).
const DESKTOP = [
  { href: "/", label: "Accueil" },
  { href: "/films", label: "Journal" },
  { href: "/conseils", label: "Découvrir" },
  { href: "/critiques", label: "Critiques" },
  { href: "/collection", label: "Collection" },
  { href: "/agenda", label: "Agenda" },
  { href: "/activite", label: "La bande" },
];
// Mobile : 4 onglets + « Plus », comme une appli native.
const MOBILE = [
  { href: "/", label: "Accueil", icon: ICONS.home },
  { href: "/films", label: "Journal", icon: ICONS.films },
  { href: "/recherche", label: "Chercher", icon: ICONS.search },
  { href: "/conseils", label: "Découvrir", icon: ICONS.spark },
];
// Tout le reste, dans le panneau « Plus » (mobile), rangé par usage
const MORE = [
  {
    title: "Mon cinéma",
    links: [
      { href: "/critiques", label: "Critiques", icon: ICONS.pen },
      { href: "/watchlist", label: "Watchlist", icon: ICONS.bookmark },
      { href: "/listes", label: "Listes", icon: ICONS.list },
      { href: "/preferes", label: "Préférés", icon: ICONS.heart },
      { href: "/collection", label: "Collection", icon: ICONS.disc },
      { href: "/stats", label: "Stats", icon: ICONS.chart },
    ],
  },
  {
    title: "Sortir",
    links: [
      { href: "/alertes", label: "Au cinéma", icon: ICONS.bell },
      { href: "/agenda", label: "Agenda", icon: ICONS.calendar },
      { href: "/activite", label: "La bande", icon: ICONS.people },
    ],
  },
  {
    title: "Moi",
    links: [
      { href: "/compte", label: "Mon compte", icon: ICONS.user },
      { href: "/installer", label: "Installer", icon: ICONS.download },
    ],
  },
];
// Menu du compte (ordinateur)
const ACCOUNT = [
  { href: "/compte", label: "Mon compte", icon: ICONS.user },
  { href: "/stats", label: "Mes stats", icon: ICONS.chart },
  { href: "/preferes", label: "Mes préférés", icon: ICONS.heart },
  { href: "/watchlist", label: "Watchlist", icon: ICONS.bookmark },
  { href: "/listes", label: "Listes", icon: ICONS.list },
  { href: "/alertes", label: "Au cinéma", icon: ICONS.bell },
  { href: "/installer", label: "Installer l'appli", icon: ICONS.download },
];
// Les pages « racines » des onglets du bas : ailleurs, on affiche une flèche de retour.
const ROOTS = ["/", "/films", "/recherche", "/conseils"];
// Pages rangées sous chaque rubrique
const SECTIONS: Record<string, string[]> = {
  "/films": ["/films", "/watchlist", "/listes", "/personnes", "/personne", "/preferes"],
  "/conseils": ["/conseils", "/alertes", "/recherche"],
  "/activite": ["/activite", "/membres", "/membre"],
};

export function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

type NavUser = { name: string; isAdmin: boolean };

function Bell({ alerts }: { alerts: number }) {
  return (
    <Link
      href="/alertes"
      className="relative flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-foreground"
      aria-label={`Au cinéma${alerts ? ` : ${alerts} nouvelle(s) alerte(s)` : ""}`}
    >
      <Icon d={ICONS.bell} />
      {alerts > 0 && (
        <span className="absolute top-1.5 right-1.5 flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative size-2 rounded-full bg-accent ring-2 ring-background" />
        </span>
      )}
    </Link>
  );
}

// Menu du compte : l'initiale, puis toutes les pages personnelles
function AccountMenu({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
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
  const links = user.isAdmin ? [...ACCOUNT, { href: "/admin", label: "Administration", icon: ICONS.shield }] : ACCOUNT;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mon compte"
        className="flex size-9 items-center justify-center rounded-full bg-accent font-display text-base text-on-accent ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-accent/60"
      >
        {user.name.slice(0, 1).toUpperCase()}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="card glass absolute right-0 z-50 mt-3 w-64 origin-top-right !rounded-2xl p-2 shadow-2xl shadow-black/50"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="px-3 pt-2 pb-3">
              <p className="eyebrow">Connecté</p>
              <p className="mt-1.5 truncate font-display text-2xl leading-none">{user.name}</p>
            </div>
            {links.map((l) => (
              <Link key={l.href} href={l.href} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground/85 transition hover:bg-surface-2 hover:text-foreground">
                <Icon d={l.icon} className="size-4 text-muted" />
                {l.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Retour en arrière : la page précédente de l'appli, sinon l'accueil (appli ouverte directement sur une page).
function useGoBack() {
  const router = useRouter();
  return useCallback(() => (window.history.length > 1 ? router.back() : router.push("/")), [router]);
}

// La barre du haut se range quand on descend (plus de place pour le contenu) et revient dès qu'on remonte.
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        if (Math.abs(y - last) > 6) {
          setHidden(y > last && y > 160);
          last = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return { hidden, scrolled };
}

export function Nav({ theme, alerts, user }: { theme: Theme; alerts: number; user: NavUser }) {
  const path = usePathname();
  const goBack = useGoBack();
  const [more, setMore] = useState(false);
  const { hidden, scrolled } = useHideOnScroll();
  const isRoot = ROOTS.includes(path);
  useEffect(() => setMore(false), [path]);
  // Les éléments collants de la page (sommaire d'une fiche…) se calent sous la barre, ou tout en haut quand elle se range
  useEffect(() => {
    document.documentElement.style.setProperty("--nav-offset", hidden ? "0px" : "4.25rem");
  }, [hidden]);

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

  const active = (href: string) => (href === "/" ? path === "/" : (SECTIONS[href] ?? [href]).some((l) => path.startsWith(l)));
  const moreActive = MORE.some((g) => g.links.some((l) => path.startsWith(l.href))) && !MOBILE.some((l) => active(l.href));
  const desktopActive = DESKTOP.find((l) => active(l.href))?.href;

  return (
    <>
      <CommandPalette isAdmin={user.isAdmin} />

      {/* Ordinateur : logo, rubriques, recherche (⌘K), alertes, thème, compte */}
      <header
        className={`sticky top-0 z-40 hidden transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] md:block ${hidden ? "-translate-y-full" : ""} ${scrolled ? "glass shadow-[0_1px_0_var(--line)]" : ""}`}
      >
        <nav className="mx-auto flex h-[4.25rem] max-w-[88rem] items-center gap-6 px-10">
          <Link href="/" aria-label="Dreams, accueil" className="shrink-0 transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <div className="relative flex items-center gap-0.5 lg:ml-4">
            {DESKTOP.map((l) => {
              const on = desktopActive === l.href;
              return (
                <Link key={l.href} href={l.href} className={`relative rounded-full px-3.5 py-2 text-sm transition-colors ${on ? "text-foreground" : "text-muted hover:text-foreground"}`}>
                  {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-surface-2 shadow-[inset_0_1px_0_var(--highlight)]" transition={{ duration: 0.5, ease: EASE }} />}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={openPalette}
              className="group mr-1 flex h-9 w-52 items-center gap-2.5 rounded-full border border-border bg-surface/60 pr-2 pl-3.5 text-sm text-muted transition hover:border-accent/50 hover:text-foreground lg:w-64"
              aria-label="Rechercher (⌘K)"
            >
              <Icon d={ICONS.search} className="size-4" />
              <span className="flex-1 text-left">Rechercher…</span>
              <kbd className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wider">⌘K</kbd>
            </button>
            <Bell alerts={alerts} />
            <ThemeSwitch initial={theme} />
            <AccountMenu user={user} />
          </div>
        </nav>
      </header>

      {/* Mobile : logo ou retour en haut, onglets flottants en bas */}
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

      <AnimatePresence>
        {more && (
          <motion.div className="fixed inset-0 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setMore(false)} />
            <motion.div
              className="card absolute inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] !rounded-[1.75rem] p-4 pt-7 shadow-2xl"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => (info.offset.y > 60 || info.velocity.y > 400) && setMore(false)}
            >
              <span className="absolute top-2.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border" aria-hidden />
              {MORE.map((g, gi) => (
                <div key={g.title} className={gi ? "mt-4" : ""}>
                  <p className="eyebrow mb-2 px-1">{g.title}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {g.links.map((l, i) => (
                      <motion.div key={l.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * (gi * 3 + i), duration: 0.4, ease: EASE }}>
                        <Link
                          href={l.href}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs ${path.startsWith(l.href) ? "bg-accent-soft text-accent" : "bg-surface-2/60 text-foreground"}`}
                        >
                          <Icon d={l.icon} />
                          {l.label}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-40 md:hidden" aria-label="Navigation principale">
        <div className="glass card flex !rounded-[1.4rem] p-1 shadow-[0_18px_40px_-12px_#000c]">
          {MOBILE.map((l) => {
            const on = active(l.href) && !more;
            return (
              <Link key={l.href} href={l.href} className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] transition-colors ${on ? "text-accent" : "text-muted"}`}>
                {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-2xl bg-accent-soft" transition={{ duration: 0.45, ease: EASE }} />}
                <Icon d={l.icon} className="relative size-[22px]" />
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMore(!more)}
            aria-expanded={more}
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] transition-colors ${more || moreActive ? "text-accent" : "text-muted"}`}
          >
            {(more || moreActive) && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-2xl bg-accent-soft" transition={{ duration: 0.45, ease: EASE }} />}
            <motion.span className="relative" animate={{ rotate: more ? 90 : 0 }} transition={{ duration: 0.4, ease: EASE }}>
              <Icon d={more ? ICONS.close : ICONS.more} className="size-[22px]" />
            </motion.span>
            <span className="relative">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
