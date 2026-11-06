"use client";

import Link from "next/link";

// Erreur inattendue : un message simple, sans détail technique, et deux façons de repartir.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-[clamp(2.2rem,6vw,4.4rem)] leading-none">Un problème est survenu</h1>
      <p className="mt-4 max-w-md text-[15px] text-muted">La page n&apos;a pas pu être affichée. Réessayez dans un instant.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Réessayer
        </button>
        <Link href="/" className="btn">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
