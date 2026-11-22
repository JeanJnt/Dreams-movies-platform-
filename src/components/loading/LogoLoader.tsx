"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "../Logo";

/*
 * L'indicateur de chargement de Dreams : le logo argent, avec le reflet qui balaie le métal.
 * Volontairement en SVG : un chargement ne doit pas ouvrir un contexte WebGL de plus pendant
 * que la vraie scène 3D se prépare (c'était la source principale des saccades).
 * « Réduire les animations » : le logo immobile.
 */
export function LogoLoader({ size = 120, label = "Chargement", className = "", inline = false }: { size?: number; label?: string; className?: string; inline?: boolean }) {
  const [calm, setCalm] = useState(false);
  useEffect(() => setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return (
    <div role="status" aria-live="polite" className={`flex ${inline ? "flex-row gap-3" : "flex-col gap-4"} items-center justify-center ${className}`}>
      <div className="grid place-items-center" style={{ width: size, height: size }} aria-hidden>
        <BrandMark className={`w-[78%] ${calm ? "" : "loader-sheen"}`} />
      </div>
      <span className={inline ? "text-[14px] text-muted" : "sr-only"}>{label}…</span>
    </div>
  );
}
