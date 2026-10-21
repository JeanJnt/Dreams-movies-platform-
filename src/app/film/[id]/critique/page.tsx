import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CritiqueEditor } from "@/components/CritiqueEditor";
import { critiqueForFilm } from "@/lib/critiques";
import { filmDetail } from "@/lib/queries";

export const metadata: Metadata = { title: "Écrire une critique" };
export const dynamic = "force-dynamic";

export default async function EditCritiquePage({ params }: { params: Promise<{ id: string }> }) {
  const filmId = Number((await params).id);
  const [film, critique] = await Promise.all([filmDetail(filmId), critiqueForFilm(filmId)]);
  if (!film) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <CritiqueEditor
        filmId={filmId}
        filmTitle={film.title_fr ?? film.name}
        defaultRating={film.rating}
        initial={critique && { id: critique.id, title: critique.title, lede: critique.lede, body: critique.body, rating: critique.rating, status: critique.status }}
      />
    </div>
  );
}
