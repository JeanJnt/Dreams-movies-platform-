"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { usePathname } from "next/navigation";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/*
 * Le mouvement des pages, orchestré par GSAP :
 *   1. à chaque changement de page, le contenu entre (fondu + 14 px, 0,42 s, power3.out) ;
 *   2. le titre principal [data-split] se compose ligne par ligne (SplitText) ;
 *   3. les éléments marqués [data-reveal] apparaissent quand on les atteint (ScrollTrigger, une seule fois) ;
 *      dans une grille [data-stagger], les enfants arrivent en cascade (30 ms d'écart, 24 éléments au plus).
 * Tout est rangé dans un contexte GSAP (useGSAP) : timelines et déclencheurs sont détruits au changement de page.
 * Avec « réduire les animations », rien ne bouge : l'état final est affiché tout de suite.
 */
let hydrated = false;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add({ calm: "(prefers-reduced-motion: reduce)", full: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (ctx.conditions?.calm) return;
        // Première visite : on attend que React ait fini d'hydrater la page (sinon les styles posés par GSAP
        // ne correspondent plus au HTML du serveur). Navigations suivantes : tout de suite.
        const first = !hydrated;
        hydrated = true;
        const run = () =>
          ctx.add(() => {
            if (!first) gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.42, ease: "power3.out", clearProps: "transform,opacity,visibility" });
            el.querySelectorAll<HTMLElement>("[data-split]").forEach((h) => {
              const split = SplitText.create(h, { type: "lines", mask: "lines", autoSplit: true });
              gsap.from(split.lines, { yPercent: 105, duration: 0.8, ease: "power4.out", stagger: 0.07, delay: 0.05 });
            });
            el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((s) => {
              const r = s.getBoundingClientRect();
              if (r.top < window.innerHeight * 0.9) return; // déjà à l'écran : pas d'apparition
              const items = s.hasAttribute("data-stagger") ? Array.from(s.children).slice(0, 24) : [s];
              gsap.from(items, { autoAlpha: 0, y: 18, duration: 0.55, ease: "power3.out", stagger: 0.03, clearProps: "transform,opacity,visibility", scrollTrigger: { trigger: s, start: "top 90%", once: true } });
            });
            ScrollTrigger.refresh();
          });
        // un nœud est hydraté quand React y a accroché sa fibre : on n'anime jamais avant
        const hydratedNode = (n: Element) => Object.keys(n).some((k) => k.startsWith("__reactFiber"));
        let tries = 0;
        let t: ReturnType<typeof setTimeout>;
        const attempt = () => {
          const pending = Array.from(el.querySelectorAll("[data-reveal], [data-split]")).some((n) => !hydratedNode(n));
          if (pending && tries++ < 25) t = setTimeout(attempt, 160);
          else run();
        };
        const onLoad = () => (t = setTimeout(attempt, first ? 60 : 0));
        if (!first || document.readyState === "complete") onLoad();
        else window.addEventListener("load", onLoad, { once: true });
        const t2 = setTimeout(() => ScrollTrigger.refresh(), 1200);
        return () => {
          clearTimeout(t);
          clearTimeout(t2);
          window.removeEventListener("load", onLoad);
        };
      });
    },
    { scope: root, dependencies: [path], revertOnUpdate: true },
  );

  return <div ref={root}>{children}</div>;
}
