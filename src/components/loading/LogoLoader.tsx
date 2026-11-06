"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BrandMark } from "../Logo";

const Logo3D = dynamic(() => import("../three/dreams/Logo3D").then((m) => m.Logo3D), { ssr: false, loading: () => null });

/*
 * L'indicateur de chargement de Dreams : le logo en 3D, argent, qui tourne sur lui-même.
 *   — appareils capables : le vrai volume en WebGL (Logo3D) ;
 *   — version allégée (sans WebGL, appareil modeste, économie de données) : le logo argent en SVG,
 *     avec le reflet qui balaie le métal ;
 *   — « réduire les animations » : le logo immobile.
 * Le logo SVG s'affiche toujours d'abord : la 3D le remplace dès qu'elle est prête, sans trou.
 */
type Mode = "svg" | "3d";
function capable(): Mode {
  try {
    const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    if (n.connection?.saveData) return "svg";
    if ((n.deviceMemory ?? 8) < 4 || (n.hardwareConcurrency ?? 8) < 4) return "svg";
    return document.createElement("canvas").getContext("webgl2") ? "3d" : "svg";
  } catch {
    return "svg";
  }
}

export function LogoLoader({ size = 120, label = "Chargement", className = "", inline = false }: { size?: number; label?: string; className?: string; inline?: boolean }) {
  const [mode, setMode] = useState<Mode>("svg");
  const [calm, setCalm] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMode(capable());
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);
  return (
    <div role="status" aria-live="polite" className={`flex ${inline ? "flex-row gap-3" : "flex-col gap-4"} items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* le logo plat, en attendant (et pour la version allégée) */}
        <div className={`absolute inset-0 grid place-items-center transition-opacity duration-300 ${mode === "3d" && ready ? "opacity-0" : "opacity-100"}`} aria-hidden>
          <BrandMark className={`w-[78%] ${calm ? "" : "loader-sheen"}`} />
        </div>
        {mode === "3d" && <div className="absolute inset-[-12%]">{<Logo3D spin={!calm} />}</div>}
      </div>
      <span className={inline ? "text-[14px] text-muted" : "sr-only"}>{label}…</span>
    </div>
  );
}
