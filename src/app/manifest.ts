import type { MetadataRoute } from "next";
import { cookies } from "next/headers";

// Ce fichier rend Dreams « installable » comme une vraie appli : Windows, Mac, iPhone et Android.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // l'icône de l'appli installée suit le thème choisi au moment de l'installation
  const r = (await cookies()).get("dm-theme")?.value === "rouge" ? "-rouge" : "";
  return {
    id: "/",
    name: "Dreams Movies — journal de cinéma",
    short_name: "Dreams",
    description: "Films vus, critiques, conseils, collection, agenda et statistiques.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    // Noir, comme le logo : couleur de l'écran de démarrage de l'appli
    background_color: "#000000",
    theme_color: "#000000",
    lang: "fr",
    dir: "ltr",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: `/icon-192${r}.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icon-512${r}.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      // Android découpe l'icône en cercle ou en goutte : version avec plus de marge
      { src: `/icon-maskable-512${r}.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Raccourcis : appui long sur l'icône (Android) ou clic droit (Windows / Mac)
    shortcuts: [
      { name: "Que regarder ce soir ?", short_name: "Conseils", url: "/conseils", icons: [{ src: `/icon-192${r}.png`, sizes: "192x192" }] },
      { name: "Scanner un DVD", short_name: "Scanner", url: "/collection/scanner", icons: [{ src: `/icon-192${r}.png`, sizes: "192x192" }] },
      { name: "Mon agenda", short_name: "Agenda", url: "/agenda", icons: [{ src: `/icon-192${r}.png`, sizes: "192x192" }] },
      { name: "Au cinéma", short_name: "Cinéma", url: "/alertes", icons: [{ src: `/icon-192${r}.png`, sizes: "192x192" }] },
    ],
  };
}
