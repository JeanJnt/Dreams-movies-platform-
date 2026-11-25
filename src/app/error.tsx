"use client";

import Link from "next/link";
import { useEffect } from "react";

// Après une mise en ligne, un onglet resté ouvert garde l'ancienne version et réclame des fichiers qui n'existent plus :
// un simple rechargement suffit. On le fait une fois, tout seul (au plus une fois par minute, pour ne pas tourner en boucle).
const STALE = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem("dm-reload") ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem("dm-reload", String(Date.now()));
  } catch {
    // stockage indisponible (navigation privée) : on recharge quand même, une fois
  }
  window.location.reload();
  return true;
}

// Erreur inattendue : un message simple, et deux façons de repartir. Le code permet de retrouver l'erreur dans les journaux.
export default function Error({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (STALE.test(`${error.name} ${error.message}`)) reloadOnce();
  }, [error]);

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-[clamp(2.2rem,6vw,4.4rem)] leading-none">Un problème est survenu</h1>
      <p className="mt-4 max-w-md text-[15px] text-muted">La page n&apos;a pas pu être affichée. Réessayez dans un instant.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {/* recharge vraiment la page : reprend la dernière version de l'appli */}
        <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
          Réessayer
        </button>
        <Link href="/" className="btn">
          Retour à l&apos;accueil
        </Link>
      </div>
      {error.digest && <p className="mt-10 text-[12px] text-faint tabular">Code : {error.digest}</p>}
    </div>
  );
}
