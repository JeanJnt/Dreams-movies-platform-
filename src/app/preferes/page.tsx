import type { Metadata } from "next";
import { TopFilmsEditor } from "@/components/TopFilmsEditor";
import { topFilms } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Mes 10 films" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function TopFilmsPage() {
  const top = await topFilms();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader size="lg" title="Mes 10 films" />
      <TopFilmsEditor initial={top.map((f) => ({ key: `f${f.id}`, title: f.title_fr ?? f.name, year: f.year, poster: f.poster_path }))} />
    </div>
  );
}
