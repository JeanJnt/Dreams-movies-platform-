"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setPlatformsAction } from "@/app/actions";

const MODES = [
  { value: "pour-toi", label: "D'après mes goûts" },
  { value: "watchlist", label: "Dans ma watchlist" },
];
const DECADES = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950, 1940, 1930, 1920];

// Curseur de durée : de 1 h à 4 h, par pas de 15 min. Tout à droite = pas de limite.
const MIN_RUNTIME = 60;
const MAX_RUNTIME = 240;

const formatMinutes = (m: number) => `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`;

function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };
  return { params, update, pending };
}

export function PickFilters({ genres }: { genres: string[] }) {
  const { params, update, pending } = useParamUpdater();
  const mode = params.get("mode") ?? (params.get("from") ? "similaire" : "pour-toi");
  const onlyMine = params.get("partout") !== "1";
  const activeCount = ["genre", "duree", "decennie"].filter((k) => params.get(k)).length;

  return (
    <div className={`space-y-5 rounded-2xl border border-border bg-surface p-4 transition-opacity md:p-5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-background p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => update({ mode: m.value, from: "" })}
              className={`rounded-lg px-3.5 py-1.5 text-sm transition ${mode === m.value ? "bg-accent text-on-accent shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={() => update({ partout: onlyMine ? "1" : "" })} className="flex items-center gap-2.5 text-sm" role="switch" aria-checked={onlyMine}>
          <span className={`relative h-5 w-9 rounded-full transition ${onlyMine ? "bg-accent" : "bg-surface-2"}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-foreground shadow transition-all ${onlyMine ? "left-[18px]" : "left-0.5"}`} />
          </span>
          Seulement sur mes plateformes
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.6fr]">
        <label className="space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-muted">Genre</span>
          <select value={params.get("genre") ?? ""} onChange={(e) => update({ genre: e.target.value })} className="field w-full">
            <option value="">Tous les genres</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-muted">Époque</span>
          <select value={params.get("decennie") ?? ""} onChange={(e) => update({ decennie: e.target.value })} className="field w-full">
            <option value="">Toutes les époques</option>
            {DECADES.map((d) => <option key={d} value={d}>Années {d}</option>)}
          </select>
        </label>
        <DurationSlider value={params.get("duree")} onCommit={(v) => update({ duree: v })} />
      </div>

      {activeCount > 0 && (
        <button onClick={() => update({ genre: "", duree: "", decennie: "" })} className="text-xs text-muted hover:text-accent">
          Effacer les filtres ({activeCount})
        </button>
      )}
    </div>
  );
}

function DurationSlider({ value, onCommit }: { value: string | null; onCommit: (v: string) => void }) {
  const [minutes, setMinutes] = useState(value ? Number(value) : MAX_RUNTIME);
  useEffect(() => setMinutes(value ? Number(value) : MAX_RUNTIME), [value]);

  // La page se met à jour quand on relâche le curseur, pas à chaque cran.
  const commit = () => onCommit(minutes >= MAX_RUNTIME ? "" : String(minutes));
  const fill = ((minutes - MIN_RUNTIME) / (MAX_RUNTIME - MIN_RUNTIME)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-muted">Durée max.</span>
        <span className="font-display text-lg leading-none text-accent">{minutes >= MAX_RUNTIME ? "Sans limite" : formatMinutes(minutes)}</span>
      </div>
      <div className="flex h-[38px] items-center">
        <input
          type="range"
          min={MIN_RUNTIME}
          max={MAX_RUNTIME}
          step={15}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          className="range"
          style={{ "--fill": `${fill}%` } as React.CSSProperties}
          aria-label="Durée maximum"
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>1 h</span><span>2 h</span><span>3 h</span><span>∞</span>
      </div>
    </div>
  );
}

export function PlatformPicker({ all, mine }: { all: { key: string; name: string }[]; mine: string[] }) {
  const [selected, setSelected] = useState(mine);
  const [pending, startTransition] = useTransition();
  const toggle = (key: string) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(next);
    startTransition(() => setPlatformsAction(next));
  };
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${pending ? "opacity-70" : ""}`}>
      <span className="mr-1 text-xs uppercase tracking-wider text-muted">Mes abonnements</span>
      {all.map((p) => (
        <button
          key={p.key}
          onClick={() => toggle(p.key)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            selected.includes(p.key) ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"
          }`}
        >
          {selected.includes(p.key) ? "✓ " : "+ "}{p.name}
        </button>
      ))}
    </div>
  );
}
