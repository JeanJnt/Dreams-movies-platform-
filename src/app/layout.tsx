import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Bungee, Jost } from "next/font/google";
import { cookies } from "next/headers";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PwaSetup } from "@/components/PwaSetup";
import { NavProgress } from "@/components/motion/NavProgress";
import { PageTransition } from "@/components/motion/PageTransition";
import { Splash } from "@/components/loading/Splash";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { unseenAlerts } from "@/lib/alerts";
import { currentUser } from "@/lib/auth";
import "./globals.css";

/*
 * Identité Dreams Movies (voir design-system/dreams-movies/MASTER.md)
 *   Bungee — titres : des capitales d'enseigne, massives, comme le fronton lumineux d'un cinéma.
 *   Jost — interface, texte courant et génériques : la géométrique « à la Futura » des éditions de cinéma.
 *   Bodoni Moda — réservée aux jaquettes de « La Collection Dreams » (objets du film, indépendants du site et du thème).
 */
const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], display: "swap" });
const bungee = Bungee({ variable: "--font-bungee", subsets: ["latin"], weight: "400", display: "swap" });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"], display: "swap" });

// L'icône suit le thème : étoile argent (noir et blanc) ou rouge (noir et rouge), dans l'onglet comme sur l'écran d'accueil
export async function generateMetadata(): Promise<Metadata> {
  const r = (await cookies()).get("dm-theme")?.value === "rouge" ? "-rouge" : "";
  return {
    title: { default: "Dreams Movies", template: "%s · Dreams Movies" },
    description: "Le journal de cinéma entre amis : films vus, critiques, collection de DVD, séances et statistiques.",
    appleWebApp: { capable: true, title: "Dreams", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
    applicationName: "Dreams Movies",
    icons: {
      icon: [
        { url: `/brand/icone${r}.svg`, type: "image/svg+xml" },
        { url: `/icon-192${r}.png`, sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: `/apple-icon${r}.png`, sizes: "180x180" }],
    },
  };
}

export const viewport: Viewport = { themeColor: "#000000", viewportFit: "cover", colorScheme: "dark" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  const alerts = user ? await unseenAlerts() : 0;
  // le thème choisi (noir et blanc par défaut, ou noir et rouge), posé dès le rendu serveur
  const theme = (await cookies()).get("dm-theme")?.value === "rouge" ? "rouge" : undefined;
  return (
    <html lang="fr" data-theme={theme} className={`${bodoni.variable} ${bungee.variable} ${jost.variable}`}>
      <body className="antialiased">
        <Splash />
        <PwaSetup />
        <SmoothScroll />
        <NavProgress />
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        {/* La navigation n'apparaît qu'une fois connecté */}
        {user && <Nav alerts={alerts} user={{ id: user.id, name: user.username ?? user.name, isAdmin: user.isAdmin }} />}
        <main id="contenu" tabIndex={-1} className="mx-auto max-w-[1480px] px-[var(--gutter)] pb-safe outline-none">
          <PageTransition>{children}</PageTransition>
        </main>
        {user && <Footer />}
      </body>
    </html>
  );
}
