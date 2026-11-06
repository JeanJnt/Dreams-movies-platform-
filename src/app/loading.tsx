import { LogoLoader } from "@/components/loading/LogoLoader";

// Chargement d'une page : le logo en 3D, au centre de l'écran.
export default function Loading() {
  return (
    <div className="grid min-h-[70svh] place-items-center">
      <LogoLoader size={140} label="Chargement de la page" />
    </div>
  );
}
