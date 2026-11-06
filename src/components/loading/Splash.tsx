"use client";

import { useEffect, useRef } from "react";
import { LogoLoader } from "./LogoLoader";

/*
 * Le premier chargement de l'appli : un rideau noir avec le logo argent (3D dès que possible),
 * retiré dès que la page est prête — jamais plus longtemps que nécessaire, et au plus 2,5 s.
 */
export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const done = () => ref.current?.setAttribute("data-done", "");
    const t = setTimeout(done, 2500);
    if (document.readyState === "complete") setTimeout(done, 350);
    else window.addEventListener("load", () => setTimeout(done, 250), { once: true });
    return () => clearTimeout(t);
  }, []);
  return (
    <div ref={ref} className="splash" aria-hidden>
      <LogoLoader size={150} label="Ouverture de Dreams" />
    </div>
  );
}
