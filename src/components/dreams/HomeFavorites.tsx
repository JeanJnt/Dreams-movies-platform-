"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LogoLoader } from "@/components/loading/LogoLoader";
import type { CaseFilmInfo } from "@/components/three/dreams/CaseObject";

const placeholder = (
  <div className="grid h-[min(78svh,700px)] min-h-[420px] place-items-center">
    <LogoLoader size={110} label="Chargement des boîtiers" />
  </div>
);

// Le cercle des 10 films (Three.js) est chargé à part…
const FavoritesRing = dynamic(() => import("@/components/three/dreams/FavoritesRing").then((m) => m.FavoritesRing), { ssr: false, loading: () => placeholder });

// … et seulement quand on approche de la section : ni la 3D ni son code ne ralentissent l'arrivée sur l'accueil.
export function HomeFavorites({ films }: { films: CaseFilmInfo[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref}>{near ? <FavoritesRing films={films} /> : placeholder}</div>;
}
