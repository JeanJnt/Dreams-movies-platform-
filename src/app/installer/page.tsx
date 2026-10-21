import type { Metadata } from "next";
import { InstallGuide } from "@/components/InstallGuide";

export const metadata: Metadata = { title: "Installer l'appli" };

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-2 md:pt-8">
      <div>
        <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Installer Dreams</h1>
        <p className="mt-3 text-muted">Une seule appli pour ton ordinateur, ton iPhone et Android, avec ton journal synchronisé partout.</p>
      </div>
      <InstallGuide />
    </div>
  );
}
