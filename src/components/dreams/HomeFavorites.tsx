"use client";

import dynamic from "next/dynamic";
import { LogoLoader } from "@/components/loading/LogoLoader";
import type { CaseFilmInfo } from "@/components/three/dreams/CaseObject";

// Le cercle des 10 films (Three.js) est chargé à part, quand on arrive à la section
const FavoritesRing = dynamic(() => import("@/components/three/dreams/FavoritesRing").then((m) => m.FavoritesRing), {
  ssr: false,
  loading: () => (
    <div className="grid h-[min(78svh,700px)] min-h-[420px] place-items-center">
      <LogoLoader size={110} label="Chargement des boîtiers" />
    </div>
  ),
});

export function HomeFavorites({ films }: { films: CaseFilmInfo[] }) {
  return <FavoritesRing films={films} />;
}
