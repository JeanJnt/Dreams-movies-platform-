import type { MetadataRoute } from "next";

// Ce fichier rend Dreams « installable » : icône sur le bureau / l'écran d'accueil, plein écran.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dreams 夢 — mon journal de cinéma",
    short_name: "Dreams",
    description: "Films vus, critiques, listes et statistiques.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0f18",
    theme_color: "#0d0f18",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
