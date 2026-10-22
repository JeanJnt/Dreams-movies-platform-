"use client";

import { useState, useTransition } from "react";
import { setAlertSourcesAction } from "@/app/actions";

const SOURCES = [
  { key: "watchlist", label: "Watchlist" },
  { key: "likes", label: "Coups de cœur Letterboxd" },
  { key: "top", label: "Films préférés" },
];

// Quels films surveiller pour les alertes cinéma.
export function AlertSettings({ initial }: { initial: string[] }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  const toggle = (key: string) => {
    const next = on.includes(key) ? on.filter((k) => k !== key) : [...on, key];
    setOn(next);
    start(() => setAlertSourcesAction(next));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">M&apos;alerter pour :</span>
      {SOURCES.map((s) => (
        <button
          key={s.key}
          onClick={() => toggle(s.key)}
          disabled={pending}
          aria-pressed={on.includes(s.key)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${on.includes(s.key) ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
