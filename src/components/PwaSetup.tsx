"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Réglages « appli » : service worker (hors ligne) et raccourci clavier « / » pour chercher sur ordinateur.
export function PwaSetup() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/recherche");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
