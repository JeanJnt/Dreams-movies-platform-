"use client";

import { useRef } from "react";

/*
 * Inclinaison 3D qui suit la souris, avec un reflet de lumière : pour les objets « physiques »
 * (affiches, boîtiers). Rien sur écran tactile ni si l'on préfère moins d'animations.
 * Tout passe par des variables CSS (aucun rendu React pendant le mouvement).
 */
export function Tilt({ children, className = "", max = 10, glare = true }: { children: React.ReactNode; className?: string; max?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
      el.style.setProperty("--go", "1");
    });
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--go", "0");
  };

  return (
    <div className={`[perspective:900px] ${className}`} onPointerMove={move} onPointerLeave={leave}>
      <div
        ref={ref}
        className="relative transition-transform duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] [transform-style:preserve-3d] motion-reduce:!transform-none"
        style={{ transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))" }}
      >
        {children}
        {glare && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay transition-opacity duration-500"
            style={{ opacity: "var(--go,0)", background: "radial-gradient(circle at var(--gx,50%) var(--gy,50%), #ffffff73, transparent 55%)" }}
          />
        )}
      </div>
    </div>
  );
}
