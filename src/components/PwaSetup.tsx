"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Réglages « appli » : service worker (hors ligne), raccourci clavier « / » pour chercher sur ordinateur,
// et sur téléphone Android, l'appli installée reste en vertical.
export function PwaSetup() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest?.("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/recherche");
      }
    };
    // Téléphone (petit côté < 500 px) : l'appli installée est verrouillée en portrait. Android seulement : iPhone ne le permet pas
    // et tourne librement. Les tablettes et ordinateurs tournent librement.
    const phone = Math.min(screen.width, screen.height) < 500;
    const installed = matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (phone && installed) orientation.lock?.("portrait").catch(() => {});
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
