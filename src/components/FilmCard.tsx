/* eslint-disable @next/next/no-img-element -- les affiches viennent du CDN de TMDB, déjà optimisé */
import Link from "next/link";
import type { Film } from "@/lib/queries";
import { letterboxdUrl } from "@/lib/format";
import { poster } from "@/lib/tmdb";
import { Stars } from "./Stars";

export function Poster({ film, size = "w342", className = "" }: { film: Film; size?: "w185" | "w342" | "w500"; className?: string }) {
  const src = poster(film.poster_path, size);
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2 ring-1 ring-white/5 ${className}`}>
      {src ? (
        <img src={src} alt={film.title_fr ?? film.name} loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{film.name}</div>
      )}
    </div>
  );
}

export function FilmCard({ film, caption, dim = false }: { film: Film; caption?: string; dim?: boolean }) {
  return (
    <div className={`group ${dim ? "opacity-40 hover:opacity-100" : ""}`}>
      <Link href={`/film/${film.id}`} className="block">
        <Poster film={film} className="transition duration-200 group-hover:-translate-y-1 group-hover:ring-accent/60" />
      </Link>
      <div className="mt-1.5 flex h-4 items-center gap-1 text-xs">
        {film.rating != null && <Stars rating={film.rating} />}
        {film.liked && <span className="text-heart" aria-label="coup de cœur">♥</span>}
        {caption && <span className="text-muted">{caption}</span>}
        {/* Lien direct vers la fiche Letterboxd du film */}
        <a href={letterboxdUrl(film)} target="_blank" rel="noreferrer" title="Voir sur Letterboxd" aria-label={`${film.title_fr ?? film.name} sur Letterboxd`} className="ml-auto flex gap-[2px] opacity-60 transition hover:opacity-100">
          <span className="size-2 rounded-full bg-[#ff8000]" /><span className="size-2 rounded-full bg-[#00e054]" /><span className="size-2 rounded-full bg-[#40bcf4]" />
        </a>
      </div>
    </div>
  );
}

export function FilmGrid({ films, dim }: { films: (Film & { seen?: boolean })[]; dim?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {films.map((f) => (
        <FilmCard key={f.id} film={f} dim={dim && f.seen === false} />
      ))}
    </div>
  );
}
