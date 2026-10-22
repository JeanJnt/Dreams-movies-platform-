import type { Metadata } from "next";
import { TopFilmsEditor } from "@/components/TopFilmsEditor";
import { topFilms } from "@/lib/queries";

export const metadata: Metadata = { title: "Mes films préférés" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function TopFilmsPage() {
  const top = await topFilms();
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2 md:pt-8">
      <div>
        <h1 className="page-title text-4xl leading-[0.95] md:text-6xl">Mes films préférés</h1>
        <p className="mt-3 text-muted">Tes 10 films, dans l&apos;ordre. Ils s&apos;affichent en DVD sur ton profil et deviennent tes coups de cœur dans Dreams, à la place de ceux de Letterboxd.</p>
      </div>
      <TopFilmsEditor initial={top.map((f) => ({ key: `f${f.id}`, title: f.title_fr ?? f.name, year: f.year, poster: f.poster_path }))} />
    </div>
  );
}
