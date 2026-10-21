import type { Metadata } from "next";
import { FilmGrid } from "@/components/FilmCard";
import { LibraryTabs } from "@/components/LibraryTabs";
import { watchlistFilms } from "@/lib/queries";

export const metadata: Metadata = { title: "Watchlist" };
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const films = await watchlistFilms();
  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <LibraryTabs />
      <div className="flex items-baseline justify-between">
        <h1 className="page-title font-display text-5xl leading-[0.95] md:text-7xl">Watchlist</h1>
        <span className="text-sm text-muted">{films.length.toLocaleString("fr-FR")} films à voir</span>
      </div>
      <FilmGrid films={films} />
    </div>
  );
}
