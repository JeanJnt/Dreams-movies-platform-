import { Suspense } from "react";
import type { Metadata } from "next";
import { FilmGrid } from "@/components/FilmCard";
import { LibraryTabs } from "@/components/LibraryTabs";
import { FilterBar } from "@/components/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { allGenres, watchedFilms, type FilmFilters } from "@/lib/queries";

export const metadata: Metadata = { title: "Mes films" };

export default async function FilmsPage({ searchParams }: { searchParams: Promise<FilmFilters> }) {
  const filters = await searchParams;
  const [films, genres] = await Promise.all([watchedFilms(filters), allGenres()]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<>Journal · <span className="tabular">{films.length.toLocaleString("fr-FR")}</span> films</>} title="Mes films">
        <LibraryTabs />
      </PageHeader>
      <Suspense>
        <FilterBar genres={genres} />
      </Suspense>
      {films.length ? (
        <FilmGrid films={films} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="font-display text-3xl">Aucun film ne correspond.</p>
          <p className="mt-2 text-sm text-muted">Essaie d&apos;enlever un filtre.</p>
        </div>
      )}
    </div>
  );
}
