import type { Metadata, Viewport } from "next";
import { Abril_Fatface, Bagel_Fat_One, Bodoni_Moda, Fraunces, Geist, Kaisei_Decol, Lalezar, Limelight, Syncopate } from "next/font/google";
import { cookies } from "next/headers";
import { Nav } from "@/components/Nav";
import { PwaSetup } from "@/components/PwaSetup";
import { unseenAlerts } from "@/lib/alerts";
import { currentUser } from "@/lib/auth";
import { THEMES, type Theme } from "@/lib/theme";
import "./globals.css";

// Une police de titres par thème (voir themes.css). Seule celle du thème par défaut est préchargée.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Yume (Van Gogh) : un serif généreux et « peint », très gras.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "WONK", "opsz"] });
const fat = Bagel_Fat_One({ variable: "--font-fat", weight: "400", subsets: ["latin"], preload: false });
const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const syncopate = Syncopate({ variable: "--font-syncopate", subsets: ["latin"], weight: ["400", "700"], preload: false });
const lalezar = Lalezar({ variable: "--font-lalezar", subsets: ["latin"], weight: "400", preload: false });
const kaisei = Kaisei_Decol({ variable: "--font-kaisei", subsets: ["latin"], weight: ["500", "700"], preload: false });
const abril = Abril_Fatface({ variable: "--font-abril", subsets: ["latin"], weight: "400", preload: false });
const limelight = Limelight({ variable: "--font-limelight", subsets: ["latin"], weight: "400", preload: false });

export const metadata: Metadata = {
  title: { default: "Dreams 夢", template: "%s · Dreams" },
  description: "Mon journal de cinéma : films vus, critiques, conseils, collection et statistiques.",
  appleWebApp: { capable: true, title: "Dreams", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  applicationName: "Dreams",
};

// La couleur de la barre de titre (appli installée) suit le thème choisi, dès le chargement.
export async function generateViewport(): Promise<Viewport> {
  const saved = (await cookies()).get("theme")?.value;
  const theme = THEMES.find((t) => t.key === saved) ?? THEMES[0];
  return { themeColor: theme.bar, viewportFit: "cover" };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const saved = (await cookies()).get("theme")?.value;
  const theme: Theme = THEMES.some((t) => t.key === saved) ? (saved as Theme) : "lynch";
  const user = await currentUser();
  const alerts = user ? await unseenAlerts() : 0;
  const fonts = [geistSans, fraunces, fat, bodoni, syncopate, lalezar, kaisei, limelight, abril].map((f) => f.variable).join(" ");

  return (
    // Les variables de police sont posées sur <html>, là où les thèmes les utilisent (--display).
    <html lang="fr" data-theme={theme} className={fonts}>
      <body className="antialiased">
        <PwaSetup />
        {/* Image de fond du thème (tableau, rideau, soie…) et grain de pellicule : décor seulement */}
        <div className="theme-backdrop" aria-hidden />
        <div className="theme-grain" aria-hidden />
        {/* La navigation n'apparaît qu'une fois connecté */}
        {user && <Nav theme={theme} alerts={alerts} user={{ name: user.username ?? user.name, isAdmin: user.isAdmin }} />}
        <main className="mx-auto max-w-6xl px-4 pb-safe md:px-8">{children}</main>
      </body>
    </html>
  );
}
