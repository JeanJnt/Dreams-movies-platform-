import type { Metadata } from "next";
import { InstallGuide } from "@/components/InstallGuide";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Installer l'appli" };

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader eyebrow="Application" title="Installer Dreams" lede="Sur ordinateur, iPhone et Android : Dreams s’ouvre en plein écran, comme une appli." />
      <InstallGuide />
    </div>
  );
}
