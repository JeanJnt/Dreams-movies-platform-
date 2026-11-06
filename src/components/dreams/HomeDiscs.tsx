"use client";

import dynamic from "next/dynamic";
import type { IndexFilm } from "@/components/three/dreams/DiscIndex";

// La platine est chargée à part (Three.js) : l'accueil s'affiche tout de suite, la 3D arrive ensuite.
const DiscIndex = dynamic(() => import("@/components/three/dreams/DiscIndex").then((m) => m.DiscIndex), {
  ssr: false,
  loading: () => <div className="min-h-[min(92svh,860px)]" aria-hidden />,
});

export function HomeDiscs({ films }: { films: IndexFilm[] }) {
  return <DiscIndex films={films} />;
}
