import { Suspense } from "react";
import type { Metadata } from "next";
import { FilmGrid } from "@/components/FilmCard";
import { LibraryTabs } from "@/components/LibraryTabs";
import { FilterBar } from "@/components/FilterBar";
import { allGenres, watchedFilms, type FilmFilters } from "@/lib/queries";

export const metadata: Metadata = { title: "Mes films" };

export default async function FilmsPage({ searchParams }: { searchParams: Promise<FilmFilters> }) {
  const filters = await searchParams;
  const [films, genres] = await Promise.all([watchedFilms(filters), allGenres()]);

  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <LibraryTabs />
      <div className="flex items-baseline justify-between">
        <h1 className="page-title font-display text-5xl leading-[0.95] md:text-7xl">Mes films</h1>
        <span className="text-sm text-muted">{films.length.toLocaleString("fr-FR")} films</span>
      </div>
      <Suspense>
        <FilterBar genres={genres} />
      </Suspense>
      {films.length ? <FilmGrid films={films} /> : <p className="py-16 text-center text-muted">Aucun film ne correspond.</p>}
    </div>
  );
}
