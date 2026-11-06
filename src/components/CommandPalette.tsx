"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilmHit, PersonHit } from "@/lib/search";
import { longEnough } from "@/lib/titles";

const img = (p: string | null) => (!p ? null : p.startsWith("/media/") ? p : `https://image.tmdb.org/t/p/w92${p}`);

// Toutes les pages de l'appli, avec des mots pour les retrouver.
export const PAGES = [
  { href: "/", label: "Accueil", hint: "ce soir, journal récent" },
  { href: "/films", label: "Mes films", hint: "vus, journal, notes" },
  { href: "/watchlist", label: "Watchlist", hint: "à voir" },
  { href: "/conseils", label: "Que regarder ce soir ?", hint: "conseils, recommandations, plateformes" },
  { href: "/alertes", label: "Au cinéma", hint: "alertes, séances, ressorties" },
  { href: "/critiques", label: "Mes critiques", hint: "écrire, brouillons" },
  { href: "/listes", label: "Listes", hint: "listes perso, références" },
  { href: "/preferes", label: "Mes films préférés", hint: "top 10, coups de cœur" },
  { href: "/collection", label: "Ma collection", hint: "dvd, blu-ray, 4k, étagère" },
  { href: "/collection/scanner", label: "Scanner un disque", hint: "code-barres, ajouter" },
  { href: "/personnes", label: "Cinéastes & acteurs", hint: "réalisateurs, personnes" },
  { href: "/agenda", label: "Agenda", hint: "séances, calendrier" },
  { href: "/stats", label: "Mes stats", hint: "statistiques, chiffres" },
  { href: "/stats?vue=frise", label: "Ma frise", hint: "années, chronologie" },
  { href: "/activite", label: "Activité des amis", hint: "communauté, fil" },
  { href: "/membres", label: "Membres", hint: "amis, profils" },
  { href: "/recherche", label: "Recherche avancée", hint: "chercher" },
  { href: "/compte", label: "Mon compte", hint: "profil, import letterboxd, mot de passe" },
  { href: "/installer", label: "Installer l'appli", hint: "téléphone, pwa" },
];

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type Item = { key: string; group: string; label: string; sub?: string | null; meta?: string; image?: string | null; round?: boolean; run: () => void };

export function openPalette() {
  window.dispatchEvent(new Event("dreams:palette"));
}

export function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ films: FilmHit[]; people: PersonHit[] }>({ films: [], people: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);
  // changer de page referme la palette
  const path = usePathname();
  useEffect(() => close(), [path, close]);

  // ⌘K / Ctrl+K partout, « / » hors des champs de saisie
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("dreams:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dreams:palette", onOpen);
    };
  }, []);

  // Pendant que la palette est ouverte, la page derrière ne défile plus
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => input.current?.focus());
    return () => {
      window.__lenis?.start();
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Suggestions de films et de personnes, 160 ms après la dernière frappe
  useEffect(() => {
    const query = q.trim();
    if (!longEnough(query)) {
      setHits({ films: [], people: [] });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) setHits(await res.json());
      } catch {
        // annulée par une frappe plus récente
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const items = useMemo<Item[]>(() => {
    const query = norm(q.trim());
    const pages = [...PAGES, ...(isAdmin ? [{ href: "/admin", label: "Administration", hint: "invitations, membres" }] : [])]
      .filter((p) => !query || norm(`${p.label} ${p.hint}`).includes(query))
      .map<Item>((p) => ({ key: `page:${p.href}`, group: "Aller à", label: p.label, sub: p.hint, run: () => go(p.href) }));
    const films = hits.films.map<Item>((f) => ({
      key: `film:${f.key}`,
      group: "Films",
      label: f.title,
      sub: f.sub,
      meta: f.seen ? "✓ vu" : f.year ? String(f.year) : undefined,
      image: img(f.poster),
      run: () => go(f.href),
    }));
    const people = hits.people.map<Item>((p) => ({
      key: `person:${p.id}`,
      group: "Personnes",
      label: p.name,
      sub: [p.job, p.knownFor.join(", ")].filter(Boolean).join(" · "),
      image: img(p.photo),
      round: true,
      run: () => go(`/personne/${p.id}`),
    }));
    const search = query ? [{ key: "search", group: "Recherche", label: `Chercher « ${q.trim()} » partout`, run: () => go(`/recherche?q=${encodeURIComponent(q.trim())}`) }] : [];
    return query ? [...films, ...people, ...pages.slice(0, 5), ...search] : pages;
  }, [q, hits, isAdmin, go]);

  useEffect(() => setActive(0), [q, hits]);

  // L'élément actif reste visible quand on descend au clavier
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (items.length ? (a + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === "Escape") {
      close();
    }
  };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[max(env(safe-area-inset-top),8vh)]"
          initial={false}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onMouseDown={close}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Aller à…"
            className="relative flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border border-[var(--dm-line-2)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)] backdrop-blur-2xl"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--dm-line)] px-5">
              <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5" />
              </svg>
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Un film, une personne, une page…"
                aria-label="Rechercher"
                role="combobox"
                aria-expanded
                aria-controls="palette-list"
                aria-activedescendant={items[active] ? `palette-${active}` : undefined}
                autoComplete="off"
                className="h-16 min-w-0 flex-1 bg-transparent text-[1.15rem] outline-none placeholder:text-muted"
              />
              {loading && <span className="size-4 shrink-0 animate-spin rounded-full border border-border border-t-accent" aria-hidden />}
              <kbd className="dm-kbd hidden sm:block">Échap</kbd>
            </div>

            <div ref={list} id="palette-list" role="listbox" className="overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
              {!items.length && <p className="px-3 py-10 text-center text-sm text-muted">Rien trouvé. Entrée pour chercher partout.</p>}
              {items.map((it, i) => {
                const header = it.group !== lastGroup;
                lastGroup = it.group;
                return (
                  <div key={it.key}>
                    {header && <p className="eyebrow mx-1 mt-3 mb-1 px-2">{it.group}</p>}
                    <button
                      id={`palette-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={it.run}
                      className={`relative flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${i === active ? "bg-[color-mix(in_srgb,var(--foreground)_9%,transparent)]" : ""}`}
                    >
                      
                      {it.image !== undefined && (
                        <span className={`shrink-0 overflow-hidden bg-surface-2 ${it.round ? "size-9 rounded-full" : "aspect-[2/3] w-8 rounded-[3px]"}`}>
                          {it.image && <img src={it.image} alt="" className="size-full object-cover" />}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{it.label}</span>
                        {it.sub && <span className="block truncate text-xs text-muted">{it.sub}</span>}
                      </span>
                      {it.meta && <span className={`shrink-0 tabular text-xs ${it.meta.startsWith("✓") ? "text-accent" : "text-muted"}`}>{it.meta}</span>}
                      {i === active && <span className="eyebrow shrink-0">↵</span>}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="hidden items-center gap-4 border-t border-[var(--dm-line)] px-5 py-3 sm:flex">
              <span className="eyebrow">↑↓ choisir</span>
              <span className="eyebrow">↵ ouvrir</span>
              <span className="eyebrow ml-auto">⌘K ou / pour ouvrir</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
