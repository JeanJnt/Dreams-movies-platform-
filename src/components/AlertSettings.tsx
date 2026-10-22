"use client";

import { useState, useTransition } from "react";
import { setAlertSourcesAction } from "@/app/actions";

const CHOICES = [
  { label: "Tout", keys: ["watchlist", "likes", "top"] },
  { label: "Watchlist", keys: ["watchlist"] },
  { label: "Coups de cœur", keys: ["likes"] },
  { label: "Préférés", keys: ["top"] },
];

// Quels films afficher et notifier : un seul choix, appliqué tout de suite.
export function AlertSettings({ initial }: { initial: string[] }) {
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((k) => b.includes(k));
  const [current, setCurrent] = useState(CHOICES.findIndex((c) => same(c.keys, initial)));
  const [, start] = useTransition();

  return (
    <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4" role="radiogroup" aria-label="Films suivis">
      {CHOICES.map((c, i) => (
        <button
          key={c.label}
          role="radio"
          aria-checked={current === i}
          onClick={() => {
            setCurrent(i);
            start(() => setAlertSourcesAction(c.keys));
          }}
          className={`shrink-0 rounded-full px-4 py-2 text-sm ${current === i ? "bg-foreground text-background" : "text-muted"}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
