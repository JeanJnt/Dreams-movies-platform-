/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatRuntime } from "@/lib/format";
import type { Pick } from "@/lib/reco";
import { originalUnder } from "@/lib/titles";
import { poster } from "@/lib/tmdb";

export function PickCard({ pick: p }: { pick: Pick }) {
  return (
    <Link href={p.href} className="card card-hover group flex gap-4 p-3 md:p-3.5">
      <div className="poster aspect-[2/3] w-[6.5rem] shrink-0">
        {p.posterPath && <img src={poster(p.posterPath, "w342")!} alt="" loading="lazy" className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <h3 className="font-display text-[1.4rem] leading-[1.05] transition-colors group-hover:text-accent">{p.title}</h3>
        {originalUnder(p.title, p.originalTitle) && <p className="mt-0.5 text-[13px] text-muted italic">{originalUnder(p.title, p.originalTitle)}</p>}
        <p className="mt-1.5 text-[13px] text-muted">{[p.year, p.directors[0], formatRuntime(p.runtime)].filter(Boolean).join(" · ")}</p>
        {p.genres.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {p.genres.slice(0, 3).map((g) => (
              <span key={g} className="sticker">{g}</span>
            ))}
          </div>
        )}
        {p.reasons.length > 0 && (
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted">
            Parce que vous avez aimé <span className="text-foreground">{p.reasons.join(", ")}</span>
          </p>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-3">
          {p.platforms.slice(0, 4).map((pl) => (
            <img key={pl.name} src={`https://image.tmdb.org/t/p/w92${pl.logo}`} alt={pl.name} title={pl.name} className="size-6 rounded-md" />
          ))}
          {p.inWatchlist && <span className="sticker sticker-alt ml-auto">Watchlist</span>}
        </div>
      </div>
    </Link>
  );
}

// Version affiche, pour les rangées horizontales de l'accueil.
export function PickPoster({ pick: p }: { pick: Pick }) {
  return (
    <Link href={p.href} className="group block w-[8.5rem] shrink-0 md:w-44">
      <div className="poster aspect-[2/3]">
        {p.posterPath && <img src={poster(p.posterPath, "w342")!} alt={p.title} loading="lazy" decoding="async" className="size-full object-cover" />}
        <div className="absolute bottom-1.5 left-1.5 flex gap-1 rounded-lg bg-black/55 p-1 backdrop-blur-md">
          {p.platforms.slice(0, 3).map((pl) => (
            <img key={pl.name} src={`https://image.tmdb.org/t/p/w92${pl.logo}`} alt={pl.name} className="size-5 rounded" />
          ))}
        </div>
      </div>
      <p className="mt-2.5 line-clamp-2 text-[14.5px] leading-snug font-medium">{p.title}</p>
      {originalUnder(p.title, p.originalTitle) && <p className="line-clamp-1 text-[12.5px] text-muted italic">{originalUnder(p.title, p.originalTitle)}</p>}
      <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{[p.directors[0], p.year].filter(Boolean).join(" · ")}</p>
    </Link>
  );
}
