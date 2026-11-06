import Link from "next/link";

// Page introuvable : un message clair et le chemin du retour.
export default function NotFound() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center py-20 text-center">
      <p className="wide text-muted">Erreur 404</p>
      <h1 className="mt-4 text-[clamp(2.4rem,7vw,5rem)] leading-none">Page introuvable</h1>
      <p className="mt-4 max-w-md text-[15px] text-muted">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
      <Link href="/" className="btn btn-primary mt-8">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
