/* eslint-disable @next/next/no-img-element -- les affiches viennent du CDN de TMDB, déjà optimisé */
import Link from "next/link";
import type { Film } from "@/lib/queries";
import { letterboxdUrl } from "@/lib/format";
import { poster } from "@/lib/tmdb";
import { Stars } from "./Stars";

export function Poster({ film, size = "w342", className = "" }: { film: Film; size?: "w185" | "w342" | "w500"; className?: string }) {
  const src = poster(film.poster_path, size);
  return (
    <div className={`poster aspect-[2/3] ${className}`}>
      {src ? (
        <img src={src} alt={film.title_fr ?? film.name} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center">
          <span className="font-display text-lg leading-tight">{film.title_fr ?? film.name}</span>
          {film.year && <span className="text-[12px] text-muted">{film.year}</span>}
        </div>
      )}
    </div>
  );
}

export function FilmCard({ film, caption, dim = false }: { film: Film; caption?: string; dim?: boolean }) {
  const title = film.title_fr ?? film.name;
  return (
    <div className={`group relative transition-opacity duration-300 ${dim ? "opacity-40 hover:opacity-100" : ""}`}>
      <Link href={`/film/${film.id}`} className="relative block" aria-label={title}>
        <Poster film={film} />
        {/* Coup de cœur : une gommette rouge collée en biais sur l'affiche */}
        {film.liked && (
          <span className="sticker sticker-round absolute top-2 right-2 z-10 !size-7 text-[13px]" aria-label="coup de cœur">
            ♥
          </span>
        )}
      </Link>
      <div className="mt-2.5 flex h-4 items-center gap-1.5 text-[12.5px]">
        {film.rating != null && <Stars rating={film.rating} />}
        {caption && <span className="truncate text-muted">{caption}</span>}
        {/* Lien direct vers la fiche Letterboxd du film */}
        <a
          href={letterboxdUrl(film)}
          target="_blank"
          rel="noreferrer"
          title="Voir sur Letterboxd"
          aria-label={`${title} sur Letterboxd`}
          className="ml-auto flex shrink-0 gap-[2px] opacity-0 transition group-hover:opacity-70 hover:!opacity-100 max-md:opacity-50"
        >
          <span className="size-1.5 rounded-full bg-[#ff8000]" />
          <span className="size-1.5 rounded-full bg-[#00e054]" />
          <span className="size-1.5 rounded-full bg-[#40bcf4]" />
        </a>
      </div>
    </div>
  );
}

export function FilmGrid({ films, dim }: { films: (Film & { seen?: boolean })[]; dim?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 md:gap-x-5 md:gap-y-8 lg:grid-cols-6 xl:grid-cols-8">
      {films.map((f) => (
        <FilmCard key={f.id} film={f} dim={dim && f.seen === false} />
      ))}
    </div>
  );
}
