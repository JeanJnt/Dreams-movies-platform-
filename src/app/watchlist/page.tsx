import type { Metadata } from "next";
import { FilmGrid } from "@/components/FilmCard";
import { LibraryTabs } from "@/components/LibraryTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { watchlistFilms } from "@/lib/queries";

export const metadata: Metadata = { title: "Watchlist" };
export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const films = await watchlistFilms();
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={<><span className="tabular">{films.length.toLocaleString("fr-FR")}</span> films à voir</>} title="Watchlist">
        <LibraryTabs />
      </PageHeader>
      <FilmGrid films={films} />
    </div>
  );
}
