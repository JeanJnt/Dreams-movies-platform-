import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Bodoni_Moda, Fraunces, Geist, Kaisei_Decol, Lalezar, Limelight, Syncopate } from "next/font/google";
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
const limelight = Limelight({ variable: "--font-limelight", subsets: ["latin"], weight: "400", preload: false });

export const metadata: Metadata = {
  title: { default: "Dreams 夢", template: "%s · Dreams" },
  description: "Mon journal de cinéma : films vus, critiques, conseils, collection et statistiques.",
  appleWebApp: { capable: true, title: "Dreams", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  applicationName: "Dreams",
};

export const viewport: Viewport = {
  themeColor: "#101c55",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const saved = (await cookies()).get("theme")?.value;
  const theme: Theme = THEMES.some((t) => t.key === saved) ? (saved as Theme) : "yume";
  const user = await currentUser();
  const alerts = user ? await unseenAlerts() : 0;
  const fonts = [geistSans, fraunces, fat, bodoni, syncopate, lalezar, kaisei, limelight].map((f) => f.variable).join(" ");

  return (
    // Les variables de police sont posées sur <html>, là où les thèmes les utilisent (--display).
    <html lang="fr" data-theme={theme} className={fonts}>
      <body className="antialiased">
        <PwaSetup />
        {/* La navigation n'apparaît qu'une fois connecté */}
        {user && <Nav theme={theme} alerts={alerts} user={{ name: user.name, isAdmin: user.isAdmin }} />}
        <main className="mx-auto max-w-6xl px-4 pb-safe md:px-8">{children}</main>
      </body>
    </html>
  );
}
