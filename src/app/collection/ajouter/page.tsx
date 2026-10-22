import type { Metadata } from "next";
import { CollectionAdder } from "@/components/CollectionAdder";

export const metadata: Metadata = { title: "Ajouter à ma collection" };
export const maxDuration = 60;

export default function AddToCollectionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2 md:pt-8">
      <div>
        <h1 className="page-title text-4xl leading-[0.95] md:text-6xl">Ajouter des films</h1>
        <p className="mt-3 text-muted">Plusieurs films d&apos;un coup. La jaquette se change ensuite sur la fiche.</p>
      </div>
      <CollectionAdder />
    </div>
  );
}
