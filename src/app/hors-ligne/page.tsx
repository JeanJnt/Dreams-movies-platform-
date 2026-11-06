import { BrushYume } from "@/components/Logo";

export const metadata = { title: "Hors ligne" };

// Affichée par le service worker quand il n'y a pas de réseau et que la page n'est pas en cache.
export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <BrushYume className="h-16 w-auto" />
      <h1 className="text-5xl">Hors ligne</h1>
      <p className="max-w-sm text-muted">Pas de connexion pour le moment. Les pages déjà ouvertes restent disponibles.</p>
    </div>
  );
}
