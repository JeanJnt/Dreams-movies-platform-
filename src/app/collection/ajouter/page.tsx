import type { Metadata } from "next";
import { CollectionAdder } from "@/components/CollectionAdder";

export const metadata: Metadata = { title: "Ajouter à ma collection" };
export const maxDuration = 60;

export default function AddToCollectionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-4 md:pt-14">
      <div>
        <h1 className="page-title font-display text-[clamp(2.4rem,6.5vw,4.75rem)] leading-[0.92] text-balance">Ajouter des films</h1>
        <p className="mt-3 text-muted">Ajoutez plusieurs films à la fois. Leur boîtier et leur disque se personnalisent ensuite depuis la fiche du film.</p>
      </div>
      <CollectionAdder />
    </div>
  );
}
