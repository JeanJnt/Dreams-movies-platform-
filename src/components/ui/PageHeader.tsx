import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { SectionTabs } from "./SectionTabs";

// Découpe un titre en mots qui se lèvent l'un après l'autre (CSS, rendu côté serveur).
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
 * L'en-tête des pages de rubrique :
 *   en haut, les onglets de la rubrique (où l'on est, ce qu'il y a à côté) ;
 *   puis le titre (composé ligne par ligne par GSAP) et les actions à droite (une seule action principale, en blanc).
 *   Pas de mention ni de compteur en gris sous le titre : la page se présente d’elle-même.
 */
export function PageHeader({
  title,
  actions,
  children,
  size = "xl",
  back,
  tabs = true,
}: {
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
  size?: "xl" | "lg";
  back?: { href: string; label: string };
  tabs?: boolean;
}) {
  return (
    <header className="relative pt-4 pb-2 md:pt-6">
      {tabs && <SectionTabs />}
      {back && (
        <Link href={back.href} className="arrow-link mt-6 inline-flex min-h-10 items-center gap-1 text-[14px] text-muted transition-colors hover:text-foreground">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 md:mt-16">
        <div className="min-w-0 max-w-5xl">
          <h1 data-split className={`page-title ${size === "xl" ? "text-[clamp(3.2rem,8vw,7.8rem)]" : "text-[clamp(2.6rem,6vw,5.2rem)]"} leading-[0.94] max-md:text-[clamp(1.9rem,9vw,3.2rem)]`}>
            {title}
          </h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-8">{children}</div>}
    </header>
  );
}
