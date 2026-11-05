"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/*
 * Fine barre de lumière en haut de l'écran pendant qu'une page se charge.
 * Les pages sont calculées sur le serveur : sans ce signal, un clic semble parfois ne rien faire.
 */
function Bar() {
  const path = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      clearTimeout(timer.current);
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 500);
    return () => clearTimeout(timer.current);
  }, [path, params]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px]">
      <div
        className="h-full origin-left bg-accent shadow-[0_0_12px_var(--accent)]"
        style={{
          transform: `scaleX(${state === "loading" ? 0.8 : state === "done" ? 1 : 0})`,
          opacity: state === "idle" ? 0 : 1,
          transition:
            state === "loading" ? "transform 8s cubic-bezier(.05,.7,.1,1), opacity .1s" : "transform .3s ease-out, opacity .4s ease .25s",
        }}
      />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
