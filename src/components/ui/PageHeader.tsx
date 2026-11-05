import Link from "next/link";
import { Fragment, type ReactNode } from "react";

// Découpe un titre en mots qui montent l'un après l'autre (animation CSS, rendue côté serveur).
export function TitleWords({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <span className="title-words">
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span>
            <span style={{ "--i": i + offset } as React.CSSProperties}>{w}</span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/*
 * En-tête de page, façon revue de cinéma :
 *   petite mention en chasse fixe (« Journal — 570 films »), très grand titre, chapeau, actions à droite.
 * h1.page-title reste le point d'accroche des thèmes (motif sous le titre, tailles propres à chaque film).
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  children,
  size = "xl",
  back,
}: {
  eyebrow?: ReactNode;
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  size?: "xl" | "lg";
  back?: { href: string; label: string };
}) {
  return (
    <header className="pt-4 pb-2 md:pt-14">
      {back && (
        <Link href={back.href} className="arrow-link eyebrow mb-5 hover:text-foreground">
          <svg viewBox="0 0 24 24" className="size-3.5 rotate-180" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-4xl">
          {eyebrow && <p className="eyebrow mb-4 flex items-center gap-3 md:mb-5"><span className="h-px w-8 bg-accent" aria-hidden />{eyebrow}</p>}
          <h1
            className={`page-title font-display leading-[0.92] text-balance ${
              size === "xl" ? "text-[clamp(2.9rem,8.5vw,6.75rem)]" : "text-[clamp(2.4rem,6.5vw,4.75rem)]"
            }`}
          >
            <TitleWords text={title} />
          </h1>
          {lede && <div className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">{lede}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-8">{children}</div>}
    </header>
  );
}
