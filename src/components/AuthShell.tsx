import { Smoke } from "./fx/Smoke";
import { BrushYume } from "./Logo";
import { TitleWords } from "./ui/PageHeader";

/*
 * Écrans de connexion et d'inscription (sans la navigation de l'appli) : on entre dans la salle.
 * La fumée flotte dans le faisceau du projecteur (WebGL) ; le 夢 tracé au pinceau en grand, et le formulaire sur une plaque de verre.
 */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative ml-[calc(50%-50vw)] min-h-[100svh] w-screen overflow-hidden">
      <Smoke className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

      <div className="relative mx-auto grid min-h-[100svh] max-w-[88rem] items-center gap-10 px-[var(--gutter)] py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div className="text-center lg:text-left">
          <BrushYume className="mx-auto h-24 w-auto text-accent drop-shadow-[0_0_40px_color-mix(in_srgb,var(--accent)_45%,transparent)] lg:mx-0 lg:h-44" />
          <p className="eyebrow mt-8 lg:mt-12">Journal de cinéma · sur invitation</p>
          <p className="mt-4 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.86]">
            <TitleWords text="Dreams" />
          </p>
          <p className="mx-auto mt-6 hidden max-w-md text-lg leading-relaxed text-muted lg:mx-0 lg:block">
            Ce qu&apos;on a vu, aimé, écrit et rangé sur l&apos;étagère. La salle est éteinte, la séance va commencer.
          </p>
        </div>

        <div className="card glass mx-auto w-full max-w-md !rounded-[1.75rem] p-6 shadow-[0_40px_120px_-40px_#000] md:p-9">
          <h1 className="font-display text-4xl leading-none">{title}</h1>
          <p className="mt-3 mb-7 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
