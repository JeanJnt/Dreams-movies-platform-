import { BrushYume } from "./Logo";

// Mise en page des écrans de connexion et d'inscription (sans la navigation de l'appli).
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[90vh] max-w-md flex-col justify-center py-10">
      <div className="mb-8 text-center">
        <BrushYume className="mx-auto h-24 w-auto" />
        <p className="font-display mt-4 text-4xl">Dreams</p>
        <p className="text-[10px] tracking-[0.35em] text-muted uppercase">journal de cinéma</p>
      </div>
      <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
        <h1 className="text-3xl">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
