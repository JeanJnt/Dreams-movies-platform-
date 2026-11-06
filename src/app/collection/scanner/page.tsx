import type { Metadata } from "next";
import Link from "next/link";
import { Scanner } from "@/components/Scanner";
import { CASE_TYPES, FORMATS } from "@/lib/collection";

export const metadata: Metadata = { title: "Scanner un film" };

export default function ScannerPage() {
  return (
    <div className="space-y-8 pt-4 md:pt-14">
      <Link href="/collection" className="eyebrow hover:text-foreground">← Ma collection</Link>
      <div>
        <h1 className="page-title font-display text-[clamp(2.9rem,8.5vw,6.75rem)] leading-[0.92] text-balance">Scanner</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Scannez le code-barres au dos du boîtier : Dreams reconnaît le film, le format, le boîtier et l&apos;éditeur. Il ne reste qu&apos;à confirmer.
        </p>
      </div>
      <Scanner formats={FORMATS} caseTypes={CASE_TYPES} />
    </div>
  );
}
