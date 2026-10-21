/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatRuntime } from "@/lib/format";
import type { Pick } from "@/lib/reco";
import { poster } from "@/lib/tmdb";

// Petit anneau qui se remplit selon le % de chances que le film me plaise.
export function MatchRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} title="Chances que ça te plaise">
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="3.5" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <span className="text-[11px] font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export function PickCard({ pick: p }: { pick: Pick }) {
  return (
    <Link href={p.href} className="group flex gap-4 rounded-2xl border border-border bg-surface p-3 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20">
      <div className="aspect-[2/3] w-[6.5rem] shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-black/10">
        {p.posterPath && <img src={poster(p.posterPath, "w342")!} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-tight group-hover:text-accent">{p.title}</h3>
            <p className="mt-1 text-xs text-muted">{[p.year, p.directors[0], formatRuntime(p.runtime)].filter(Boolean).join(" · ")}</p>
          </div>
          <MatchRing value={p.match} />
        </div>
        {p.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.genres.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{g}</span>
            ))}
          </div>
        )}
        {p.reasons.length > 0 && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
            Parce que tu as aimé <span className="text-foreground/90">{p.reasons.join(", ")}</span>
          </p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-3">
          {p.platforms.slice(0, 4).map((pl) => (
            <img key={pl.name} src={`https://image.tmdb.org/t/p/w92${pl.logo}`} alt={pl.name} title={pl.name} className="size-6 rounded-md ring-1 ring-black/10" />
          ))}
          {p.inWatchlist && <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">Watchlist</span>}
        </div>
      </div>
    </Link>
  );
}

// Version affiche, pour les rangées horizontales de l'accueil.
export function PickPoster({ pick: p }: { pick: Pick }) {
  return (
    <Link href={p.href} className="group block w-32 shrink-0 md:w-40">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 ring-1 ring-black/10">
        {p.posterPath && <img src={poster(p.posterPath, "w342")!} alt={p.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 to-transparent p-2 pt-8">
          <div className="flex gap-1">
            {p.platforms.slice(0, 2).map((pl) => (
              <img key={pl.name} src={`https://image.tmdb.org/t/p/w92${pl.logo}`} alt={pl.name} className="size-5 rounded" />
            ))}
          </div>
          <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{p.match} %</span>
        </div>
      </div>
      <p className="mt-1.5 line-clamp-1 text-sm group-hover:text-accent">{p.title}</p>
      <p className="text-xs text-muted">{[p.year, formatRuntime(p.runtime)].filter(Boolean).join(" · ")}</p>
    </Link>
  );
}
