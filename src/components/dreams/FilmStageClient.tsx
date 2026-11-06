"use client";

import dynamic from "next/dynamic";
import { LogoLoader } from "@/components/loading/LogoLoader";
import type { CaseFilmInfo } from "@/components/three/dreams/CaseObject";

// La scène 3D de la fiche (Three.js) est chargée à part : le texte de la fiche s'affiche tout de suite.
const FilmStage = dynamic(() => import("@/components/three/dreams/FilmStage").then((m) => m.FilmStage), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center"><LogoLoader size={100} label="Chargement du boîtier" /></div>,
});

export function FilmStageClient({ film, className }: { film: CaseFilmInfo; className?: string }) {
  return <FilmStage film={film} className={className} />;
}
