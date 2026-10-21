import type { Metadata } from "next";
import Link from "next/link";
import { Scanner } from "@/components/Scanner";
import { CASE_TYPES, FORMATS } from "@/lib/collection";

export const metadata: Metadata = { title: "Scanner un film" };

export default function ScannerPage() {
  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <Link href="/collection" className="text-sm text-muted hover:text-foreground">← Ma collection</Link>
      <div>
        <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Scanner</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Scanne le code-barres au dos du boîtier : l&apos;appli devine le film, le format, le boîtier et l&apos;éditeur. Tu n&apos;as plus qu&apos;à confirmer.
        </p>
      </div>
      <Scanner formats={FORMATS} caseTypes={CASE_TYPES} />
    </div>
  );
}
