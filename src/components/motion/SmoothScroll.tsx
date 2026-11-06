"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/*
 * Défilement doux à la molette (Lenis), comme un travelling : seulement sur ordinateur.
 * Sur téléphone, le défilement natif reste le plus fluide et le plus naturel.
 * Lenis et GSAP partagent la même horloge, pour que les animations liées au défilement restent synchrones.
 */
export function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) return;

    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true });
    window.__lenis = lenis;
    document.documentElement.classList.add("lenis", "lenis-smooth");
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.__lenis = undefined;
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };
  }, []);

  // Nouvelle page : on repart du haut, sans glisser.
  useEffect(() => {
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.refresh();
  }, [path]);

  return null;
}
