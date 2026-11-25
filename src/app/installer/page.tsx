import type { Metadata } from "next";
import { InstallGuide } from "@/components/InstallGuide";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Installer l'application" };

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader title="Installer Dreams" />
      <InstallGuide />
    </div>
  );
}
