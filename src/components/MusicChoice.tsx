"use client";

import { useState, useTransition } from "react";
import { setMusicPlatformAction } from "@/app/actions";
import { MUSIC_PLATFORMS, type MusicPlatform } from "@/lib/music";

// La plateforme de musique du membre : un seul choix, enregistré tout de suite (sur le compte, donc sur tous ses appareils).
export function MusicChoice({ initial }: { initial: MusicPlatform }) {
  const [current, setCurrent] = useState<MusicPlatform>(initial);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Plateforme de musique" className="flex flex-wrap gap-1.5">
        {MUSIC_PLATFORMS.map((p) => (
          <button
            key={p.key}
            role="radio"
            aria-checked={current === p.key}
            onClick={() => {
              setCurrent(p.key);
              start(() => setMusicPlatformAction(p.key));
            }}
            className={`flex min-h-10 items-center rounded-full px-4 text-[13.5px] whitespace-nowrap transition-colors ${current === p.key ? "bg-white/[0.1] text-foreground ring-1 ring-[var(--line-3)]" : "text-muted ring-1 ring-[var(--line)] hover:text-foreground"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {pending ? "Enregistrement…" : "Votre choix suit votre compte, sur tous vos appareils."}
      </p>
    </div>
  );
}
