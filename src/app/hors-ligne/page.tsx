import { BrushYume } from "@/components/Logo";

export const metadata = { title: "Hors ligne" };

// Affichée par le service worker quand il n'y a pas de réseau et que la page n'est pas en cache.
export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <BrushYume className="h-24 w-auto text-accent" />
      <h1 className="text-5xl">Hors ligne</h1>
      <p className="max-w-sm text-muted">Pas de réseau pour l&apos;instant. Les pages que tu as déjà ouvertes restent disponibles.</p>
    </div>
  );
}
