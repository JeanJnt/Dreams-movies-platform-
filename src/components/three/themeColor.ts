"use client";
import { useEffect, useState } from "react";

// La couleur de fond du thème actif (les scènes 3D s'y fondent au lieu d'un noir fixe)
export function useThemeColor(name = "--background", fallback = "#0d0303") {
  const [c, setC] = useState(fallback);
  useEffect(() => {
    const read = () => setC(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [name, fallback]);
  return c;
}
