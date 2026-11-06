"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandPalette, openPalette } from "./CommandPalette";
import { Logo } from "./Logo";
import { ThemeChoice } from "./ThemeChoice";

gsap.registerPlugin(useGSAP);

export const ICONS = {
  home: "M4 10.5 12 4l8 6.5V20H4z",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z",
  journal: "M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM5 18a2 2 0 0 1 2-2h11M9 8h6",
  disc: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 6.5a5.5 5.5 0 0 0-5.5 5.5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0",
  search: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.4-4.4",
  bell: "M6.5 16v-4.5a5.5 5.5 0 1 1 11 0V16l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0",
  back: "M15 18l-6-6 6-6",
  close: "M6 6l12 12M18 6 6 18",
  bookmark: "M7 4h10v16l-5-3.5L7 20z",
  ticket: "M3 8a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a1.5 1.5 0 0 0 0 3V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a1.5 1.5 0 0 0 0-3zM15 7v2M15 11v2M15 15v2",
  chevron: "M6 9l6 6 6-6",
  films: "M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4",
  more: "M4 7h16M4 12h16M4 17h16",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z",
};

export function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/*
 * L'architecture du site : six rubriques, chacune avec ses pages.
 * Les pages d'une rubrique s'ouvrent dans un menu au survol (ordinateur)
 * et reviennent en onglets en tête de chaque page de la rubrique (SectionNav).
 */
export type NavSection = { key: string; label: string; href: string; icon: string; match: string[]; pages: { href: string; label: string; hint: string }[] };
export const SECTIONS: NavSection[] = [
  { key: "accueil", label: "Accueil", href: "/", icon: ICONS.home, match: [], pages: [] },
  {
    key: "recherche",
    label: "Recherche",
    href: "/recherche",
    icon: ICONS.search,
    match: ["/recherche", "/personnes", "/personne"],
    pages: [
      { href: "/recherche", label: "Recherche", hint: "Films, séries et personnes, toutes langues" },
      { href: "/personnes", label: "Cinéastes et acteurs", hint: "Celles et ceux que vous suivez le plus" },
    ],
  },
  {
    key: "films",
    label: "Films",
    href: "/films",
    icon: ICONS.journal,
    match: ["/films", "/film/", "/collection", "/conseils", "/watchlist", "/listes", "/critiques", "/preferes"],
    pages: [
      { href: "/films", label: "Journal", hint: "Vos séances, film par film" },
      { href: "/collection", label: "Collection", hint: "Vos DVD et Blu-ray, en défilé ou en liste" },
      { href: "/conseils", label: "Recommandations", hint: "D'après vos goûts, sur vos plateformes" },
      { href: "/watchlist", label: "Watchlist", hint: "Les films à voir" },
      { href: "/listes", label: "Listes", hint: "Vos listes, celles de vos amis, les références" },
      { href: "/critiques", label: "Critiques", hint: "Vos textes, publiés et en cours" },
      { href: "/preferes", label: "Mes 10 films", hint: "Vos coups de cœur, en DVD sur l'accueil" },
    ],
  },
  { key: "agenda", label: "Agenda", href: "/agenda", icon: ICONS.calendar, match: ["/agenda"], pages: [] },
  { key: "affiche", label: "À l'affiche", href: "/alertes", icon: ICONS.ticket, match: ["/alertes"], pages: [] },
  {
    key: "amis",
    label: "Amis",
    href: "/activite",
    icon: ICONS.people,
    match: ["/activite", "/membres", "/membre", "/partage"],
    pages: [
      { href: "/activite", label: "Activité", hint: "Ce que vos amis regardent et écrivent" },
      { href: "/membres", label: "Amis", hint: "Leurs profils, leurs films" },
    ],
  },
];
// Téléphone : exactement cinq onglets ; le compte est en haut à droite, les amis dans le menu du compte
const MOBILE = ["accueil", "recherche", "films", "agenda", "affiche"];
// Ordinateur : la recherche a son champ dans la barre, elle n'occupe pas d'onglet
const DESKTOP = ["accueil", "films", "agenda", "affiche", "amis"];
const ROOTS = ["/", "/recherche", "/films", "/agenda", "/alertes"];

export function activeSection(path: string) {
  if (path === "/") return SECTIONS[0];
  return SECTIONS.find((s) => s.match.some((m) => path.startsWith(m))) ?? null;
}

type NavUser = { id: number; name: string; isAdmin: boolean };

function useGoBack() {
  const router = useRouter();
  return useCallback(() => (window.history.length > 1 ? router.back() : router.push("/")), [router]);
}

function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) > 6) {
          setHidden(y > last && y > 200);
          last = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

function Bell({ alerts, className = "" }: { alerts: number; className?: string }) {
  return (
    <Link
      href="/alertes"
      className={`relative flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.06] ${className}`}
      aria-label={`À l'affiche${alerts ? ` : ${alerts} nouvelle${alerts > 1 ? "s" : ""} alerte${alerts > 1 ? "s" : ""}` : ""}`}
    >
      <Icon d={ICONS.bell} />
      {alerts > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent tabular ring-2 ring-black">{alerts > 9 ? "9+" : alerts}</span>
      )}
    </Link>
  );
}

// Le menu d'une rubrique (ordinateur) : il s'ouvre au survol ou au clavier
function SectionMenu({ section, open }: { section: NavSection; open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current) return;
      if (open) gsap.fromTo(ref.current, { autoAlpha: 0, y: -6, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.18, ease: "power3.out" });
      else gsap.to(ref.current, { autoAlpha: 0, y: -4, duration: 0.12, ease: "power2.out" });
    },
    { dependencies: [open] },
  );
  return (
    <div ref={ref} className="invisible absolute top-[calc(100%+8px)] left-1/2 z-50 w-[30rem] origin-top -translate-x-1/2 opacity-0" role="menu" aria-label={section.label}>
      <div className="card grid grid-cols-2 gap-1 p-2 shadow-[0_30px_80px_-30px_#000]">
        {section.pages.map((p) => (
          <Link key={p.href} href={p.href} role="menuitem" tabIndex={open ? 0 : -1} className="rounded-[14px] p-3.5 transition-colors hover:bg-white/[0.05]">
            <span className="block text-[15px]">{p.label}</span>
            <span className="mt-1 block text-[13px] leading-snug text-muted">{p.hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AccountMenu({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
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
  useGSAP(
    () => {
      if (!panel.current) return;
      if (open) gsap.fromTo(panel.current, { autoAlpha: 0, y: -6, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.18, ease: "power3.out" });
      else gsap.to(panel.current, { autoAlpha: 0, duration: 0.12 });
    },
    { dependencies: [open] },
  );
  const links = [
    { href: `/membre/${user.id}`, label: "Mon profil" },
    { href: "/activite", label: "Activité des amis" },
    { href: "/membres", label: "Amis" },
    { href: "/stats", label: "Statistiques" },
    { href: "/compte", label: "Compte et import" },
    { href: "/installer", label: "Installer l'application" },
    ...(user.isAdmin ? [{ href: "/admin", label: "Administration" }] : []),
  ];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Mon compte" className="avatar size-10 cursor-pointer text-[15px] transition-transform active:scale-95">
        {user.name.slice(0, 1).toUpperCase()}
      </button>
      <div ref={panel} role="menu" className="invisible absolute top-[calc(100%+10px)] right-0 z-50 w-[min(19rem,calc(100vw-2rem))] origin-top-right opacity-0">
        <div className="card p-1.5 shadow-[0_30px_80px_-30px_#000]">
          <div className="px-3 pt-2.5 pb-3">
            <p className="text-[13px] text-muted">Connecté</p>
            <p className="mt-0.5 truncate font-display text-[1.6rem] leading-tight">{user.name}</p>
          </div>
          {links.map((l) => (
            <Link key={l.href} href={l.href} role="menuitem" tabIndex={open ? 0 : -1} className="flex min-h-10 items-center rounded-xl px-3 text-[14.5px] transition-colors hover:bg-white/[0.06]">
              {l.label}
            </Link>
          ))}
          <div className="mt-1.5 border-t border-[var(--line)] px-1.5 pt-3 pb-1.5">
            <p className="mb-2 px-1.5 text-[12.5px] text-muted">Thème</p>
            <ThemeChoice compact />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Nav({ alerts, user }: { alerts: number; user: NavUser }) {
  const path = usePathname();
  const goBack = useGoBack();
  const hidden = useHideOnScroll();
  const [hover, setHover] = useState<string | null>(null);
  const current = activeSection(path);
  const isRoot = ROOTS.includes(path);
  const indicator = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setHover(null), [path]);
  useEffect(() => {
    document.documentElement.style.setProperty("--nav-offset", hidden ? "0px" : "4.5rem");
  }, [hidden]);

  // Le filet argent glisse sous la rubrique active, et suit la rubrique survolée
  const target = hover ?? current?.key ?? null;
  useGSAP(
    () => {
      const el = indicator.current;
      const host = bar.current;
      if (!el || !host) return;
      const link = target ? host.querySelector<HTMLElement>(`[data-section="${target}"]`) : null;
      if (!link || link.offsetParent === null) return void gsap.to(el, { autoAlpha: 0, duration: 0.15 });
      const r = link.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      gsap.to(el, { autoAlpha: 1, x: r.left - h.left + 14, width: r.width - 28, duration: 0.32, ease: "power3.out" });
    },
    { dependencies: [target], scope: bar },
  );

  // Glisser depuis le bord gauche = retour (téléphone)
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

  const openMenu = (k: string) => {
    if (leave.current) clearTimeout(leave.current);
    setHover(k);
  };
  const closeMenu = () => {
    leave.current = setTimeout(() => setHover(null), 140);
  };

  return (
    <>
      <CommandPalette isAdmin={user.isAdmin} />

      {/* Ordinateur : le logo, les six rubriques au centre, la recherche, les alertes, le compte */}
      <header className={`nav-bar sticky top-0 z-40 hidden transition-transform duration-300 ease-[cubic-bezier(.23,1,.32,1)] md:block ${hidden && !hover ? "-translate-y-full" : ""}`}>
        <nav className="mx-auto grid h-[4.5rem] max-w-[1480px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-[var(--gutter)]" aria-label="Navigation principale">
          <Link href="/" aria-label="Dreams Movies, accueil" className="justify-self-start">
            <Logo />
          </Link>
          <div ref={bar} className="relative flex items-center" onMouseLeave={closeMenu}>
            {SECTIONS.filter((s) => DESKTOP.includes(s.key)).map((s) => {
              const on = current?.key === s.key;
              return (
                <div key={s.key} className="relative" onMouseEnter={() => openMenu(s.key)} onFocus={() => s.pages.length && openMenu(s.key)}>
                  <Link
                    href={s.href}
                    data-section={s.key}
                    aria-current={on ? "page" : undefined}
                    aria-haspopup={s.pages.length ? "menu" : undefined}
                    aria-expanded={s.pages.length ? hover === s.key : undefined}
                    className={`flex h-11 items-center px-[14px] text-[14.5px] transition-colors duration-150 ${on || hover === s.key ? "text-foreground" : "text-muted hover:text-foreground"}`}
                  >
                    {s.label}
                  </Link>
                  {s.pages.length > 0 && <SectionMenu section={s} open={hover === s.key} />}
                </div>
              );
            })}
            <span ref={indicator} className="pointer-events-none absolute bottom-0.5 left-0 h-px w-0 bg-[image:var(--marker)] opacity-0" aria-hidden />
          </div>
          <div className="flex items-center gap-1.5 justify-self-end">
            <button
              onClick={openPalette}
              className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full px-3.5 text-muted ring-1 ring-[var(--line-2)] transition-colors hover:text-foreground hover:ring-[var(--line-3)] xl:w-56"
              aria-label="Rechercher (Ctrl K)"
            >
              <Icon d={ICONS.search} className="size-[18px] shrink-0" />
              <span className="hidden flex-1 text-left text-[14px] xl:block">Rechercher</span>
              <kbd className="hidden rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-[var(--line-2)] xl:block">⌘K</kbd>
            </button>
            <Bell alerts={alerts} className="size-10" />
            <AccountMenu user={user} />
          </div>
        </nav>
      </header>

      {/* Téléphone : en haut, le logo (ou le retour), la recherche et les alertes */}
      <header className="nav-bar sticky top-0 z-40 flex items-center justify-between gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.4rem)] pb-1.5 md:hidden">
        {isRoot ? (
          <Link href="/" aria-label="Dreams Movies, accueil">
            <Logo />
          </Link>
        ) : (
          <button onClick={goBack} className="-ml-2 flex min-h-11 items-center gap-1 rounded-full pr-3 pl-1 text-[15px]" aria-label="Retour">
            <Icon d={ICONS.back} className="size-5" />
            Retour
          </button>
        )}
        <AccountMenu user={user} />
      </header>

      {/* Téléphone : la barre d'onglets, posée en bas comme une pièce de métal */}
      <nav className="tabbar fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-50 grid grid-cols-5 rounded-[26px] p-1.5 md:hidden" aria-label="Navigation principale">
        {MOBILE.map((k) => {
          const s = SECTIONS.find((x) => x.key === k)!;
          const on = current?.key === k;
          return (
            <Link
              key={k}
              href={s.href}
              aria-current={on ? "page" : undefined}
              aria-label={k === "affiche" && alerts ? `${s.label}, ${alerts} nouvelle${alerts > 1 ? "s" : ""} alerte${alerts > 1 ? "s" : ""}` : undefined}
              className={`relative flex min-h-[3.4rem] flex-col items-center justify-center gap-1 rounded-[20px] text-[10.5px] tracking-[0.02em] transition-colors duration-150 ${on ? "tab-on" : "text-muted"}`}
            >
              <Icon d={s.icon} className="size-[21px]" />
              {s.label}
              {k === "affiche" && alerts > 0 && <span className="absolute top-1.5 right-[22%] size-2 rounded-full bg-accent ring-2 ring-black" aria-hidden />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
