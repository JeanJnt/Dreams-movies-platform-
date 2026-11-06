"use client";

import dynamic from "next/dynamic";
import type { CaseFilm } from "@/components/three/cases/art";

const ModelsShowcase = dynamic(() => import("@/components/three/dreams/ModelsShowcase").then((m) => m.ModelsShowcase), {
  ssr: false,
  loading: () => <div className="skeleton h-[60svh] !rounded-[var(--r-panel)]" aria-label="Chargement des modèles" />,
});

export function ModelsClient({ films }: { films: CaseFilm[] }) {
  return <ModelsShowcase films={films} />;
}
