"use client";

import dynamic from "next/dynamic";
import { LogoLoader } from "@/components/loading/LogoLoader";
import type { ParadeRow } from "@/components/three/dreams/CaseParade";

// Le défilé (Three.js) est chargé à part : la page de la collection s'affiche tout de suite.
const CaseParade = dynamic(() => import("@/components/three/dreams/CaseParade").then((m) => m.CaseParade), {
  ssr: false,
  loading: () => <div className="grid h-[min(72svh,680px)] min-h-[440px] place-items-center"><LogoLoader size={110} label="Chargement du défilé" /></div>,
});

export function Parade({ rows }: { rows: ParadeRow[] }) {
  return <CaseParade rows={rows} />;
}
