import type { Metadata, Viewport } from "next";
import { Abril_Fatface, Bagel_Fat_One, Bodoni_Moda, Fraunces, Geist, Geist_Mono, Instrument_Serif, Kaisei_Decol, Lalezar, Limelight, Syncopate } from "next/font/google";
import { cookies } from "next/headers";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PwaSetup } from "@/components/PwaSetup";
import { NavProgress } from "@/components/motion/NavProgress";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { unseenAlerts } from "@/lib/alerts";
import { currentUser } from "@/lib/auth";
import { THEMES, type Theme } from "@/lib/theme";
import "./globals.css";

// Une police de titres par thème (voir themes.css). Seules celles du thème par défaut (Nitrate) sont préchargées.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Mentions techniques (dates, durées, numéros de section) : une chasse fixe, comme un générique de film.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Nitrate : un serif éditorial de revue de cinéma.
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
// Yume (Van Gogh) : un serif généreux et « peint », très gras.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "WONK", "opsz"], preload: false });
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
  const theme: Theme = THEMES.some((t) => t.key === saved) ? (saved as Theme) : "nitrate";
  const user = await currentUser();
  const alerts = user ? await unseenAlerts() : 0;
  const fonts = [geistSans, geistMono, instrument, fraunces, fat, bodoni, syncopate, lalezar, kaisei, limelight, abril].map((f) => f.variable).join(" ");

  return (
    // Les variables de police sont posées sur <html>, là où les thèmes les utilisent (--display).
    <html lang="fr" data-theme={theme} className={fonts}>
      <body className="antialiased">
        <PwaSetup />
        <SmoothScroll />
        <NavProgress />
        {/* Image de fond du thème (tableau, rideau, soie, faisceau du projecteur…) et grain de pellicule : décor seulement */}
        <div className="theme-backdrop" aria-hidden />
        <div className="theme-grain" aria-hidden />
        {/* La navigation n'apparaît qu'une fois connecté */}
        {user && <Nav theme={theme} alerts={alerts} user={{ name: user.username ?? user.name, isAdmin: user.isAdmin }} />}
        <main className="mx-auto max-w-[88rem] px-4 pb-safe sm:px-6 md:px-10">{children}</main>
        {user && <Footer />}
      </body>
    </html>
  );
}
