"use client";

import dynamic from "next/dynamic";
import { LogoLoader } from "@/components/loading/LogoLoader";
import type { IndexFilm } from "@/components/three/dreams/DiscIndex";

// La platine est chargée à part (Three.js) : l'accueil s'affiche tout de suite, la 3D arrive ensuite.
const DiscIndex = dynamic(() => import("@/components/three/dreams/DiscIndex").then((m) => m.DiscIndex), {
  ssr: false,
  loading: () => <div className="grid min-h-[min(92svh,860px)] place-items-center"><LogoLoader size={130} label="Chargement de la platine" /></div>,
});

export function HomeDiscs({ films }: { films: IndexFilm[] }) {
  return <DiscIndex films={films} />;
}
