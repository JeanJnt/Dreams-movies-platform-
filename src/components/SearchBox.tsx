"use client";
/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FilmHit, PersonHit } from "@/lib/search";
import { longEnough } from "@/lib/titles";

const img = (p: string | null) => (!p ? null : p.startsWith("/media/") ? p : `https://image.tmdb.org/t/p/w92${p}`);

// Barre de recherche avec suggestions pendant la frappe (films dans toutes les langues, réalisateurs, acteurs…).
// compact : version de la barre de menu (plus petite, sans focus automatique).
export function SearchBox({ defaultValue = "", compact = false }: { defaultValue?: string; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [hits, setHits] = useState<{ films: FilmHit[]; people: PersonHit[] }>({ films: [], people: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Une requête 200 ms après la dernière frappe ; les réponses périmées sont ignorées.
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
        if (res.ok) {
          setHits(await res.json());
          setActive(-1);
        }
      } catch {
        // requête annulée par une frappe plus récente
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    ...hits.films.map((f) => ({ key: f.key, href: f.href })),
    ...hits.people.map((p) => ({ key: `p${p.id}`, href: `/personne/${p.id}` })),
  ];
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (items.length ? (a + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length : -1));
    } else if (e.key === "Enter" && open && active >= 0 && items[active]) {
      e.preventDefault();
      go(items[active].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const show = open && longEnough(q) && (items.length > 0 || !loading);
  const row = (i: number) => `flex w-full items-center gap-3 px-3 py-2 text-left transition ${i === active ? "bg-surface-2" : "hover:bg-surface-2"}`;

  return (
    <div ref={box} className="relative">
      <form action="/recherche" onSubmit={() => setOpen(false)}>
        <input
          name="q"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          autoFocus={!compact}
          autoComplete="off"
          role="combobox"
          aria-expanded={show}
          aria-controls="search-suggestions"
          placeholder={compact ? "Rechercher un film, une personne…" : "Un film, dans n'importe quelle langue : Rêves, 夢, Close-Up, Cléo de 5 à 7…"}
          aria-label="Rechercher"
          className={
            compact
              ? "w-full rounded-full border border-transparent bg-surface-2/70 px-4 py-1.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-surface"
              : "w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg outline-none focus:border-accent"
          }
        />
      </form>

      {show && (
        <div id="search-suggestions" role="listbox" className={`absolute top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-2xl shadow-black/40 ${compact ? "right-0 w-[26rem] max-w-[90vw]" : "inset-x-0"}`}>
          {!items.length && <p className="px-3 py-2 text-sm text-muted">Aucune suggestion. Appuie sur Entrée pour chercher.</p>}
          {hits.films.map((f, i) => (
            <button key={f.key} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(f.href)} className={row(i)}>
              <span className="aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                {img(f.poster) && <img src={img(f.poster)!} alt="" className="size-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {f.title} <span className="text-sm text-muted">{f.year}</span>
                </span>
                {f.sub && <span className="block truncate text-xs text-muted">{f.sub}</span>}
              </span>
              {f.seen ? <span className="text-xs text-accent">✓ vu</span> : f.mine && <span className="text-xs text-muted">dans Dreams</span>}
            </button>
          ))}
          {hits.people.length > 0 && <p className="border-t border-border px-3 pt-2 pb-1 text-[11px] tracking-widest text-muted uppercase">Personnes</p>}
          {hits.people.map((p, j) => {
            const i = hits.films.length + j;
            return (
              <button key={p.id} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(`/personne/${p.id}`)} className={row(i)}>
                <span className="size-9 shrink-0 overflow-hidden rounded-full bg-surface-2">
                  {img(p.photo) && <img src={img(p.photo)!} alt="" className="size-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{[p.job, p.knownFor.join(", ")].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
