import { BrandIcon } from "./Logo";
import { TitleWords } from "./ui/PageHeader";

/*
 * Écrans de connexion et d'inscription (sans la navigation de l'appli).
 * À gauche, l'enseigne : l'étoile argent dans son écrin noir, le nom en Bodoni, la promesse en italique.
 * À droite, le formulaire, sur un panneau anthracite. Rien d'autre : on vient pour entrer.
 */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative ml-[calc(50%-50vw)] flex min-h-[100svh] w-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_40%,rgb(255_255_255/0.06),transparent_70%)]" aria-hidden />
      <div className="relative mx-auto grid w-full max-w-[1480px] flex-1 items-center gap-12 px-[var(--gutter)] py-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <BrandIcon size={88} />
          <p className="mt-10 font-display text-[clamp(4.6rem,15vw,13rem)] leading-[0.82]">
            <TitleWords text="Dreams" />
          </p>
          <p className="wide mt-4 text-muted">Movies · journal de cinéma sur invitation</p>
          <p className="serif mt-6 hidden max-w-md text-[1.6rem] leading-snug text-[var(--text-2)] lg:block">Ce qu&apos;on a vu, aimé, écrit et rangé sur l&apos;étagère. La séance va commencer.</p>
        </div>

        <div className="card relative mx-auto w-full max-w-md p-7 md:p-10">
          <h1 className="text-[3rem] leading-none">{title}</h1>
          <p className="mt-3 mb-8 text-[15px] text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
