import type { Metadata } from "next";
import { ModelsClient } from "@/components/collection/ModelsClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { caseFilms } from "@/lib/case-films";
import { recentDiary } from "@/lib/queries";

export const metadata: Metadata = { title: "Les modèles" };

// Le catalogue des boîtiers et des disques de Dreams, avec des films de votre journal
export default async function ModelsPage() {
  const recent = await recentDiary(40);
  const ids = recent.filter((f, i, a) => f.backdrop_path && a.findIndex((x) => x.id === f.id) === i).slice(0, 12).map((f) => f.id);
  const films = await caseFilms(ids, "/film");
  return (
    <div className="space-y-12">
      <PageHeader eyebrow="La Collection Dreams" title="Les modèles" lede="Toutes les jaquettes, toutes les étiquettes de disque et toutes les épaisseurs de boîtier, imprimées avec des films de votre journal." />
      <ModelsClient films={films} />
    </div>
  );
}
