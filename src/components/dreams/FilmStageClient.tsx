"use client";

import dynamic from "next/dynamic";
import type { CaseFilmInfo } from "@/components/three/dreams/CaseObject";

// La scène 3D de la fiche (Three.js) est chargée à part : le texte de la fiche s'affiche tout de suite.
const FilmStage = dynamic(() => import("@/components/three/dreams/FilmStage").then((m) => m.FilmStage), {
  ssr: false,
  loading: () => <div className="skeleton mx-auto h-full w-[60%] !rounded-[6px] opacity-30" aria-label="Chargement du boîtier" />,
});

export function FilmStageClient({ film, className }: { film: CaseFilmInfo; className?: string }) {
  return <FilmStage film={film} className={className} />;
}
