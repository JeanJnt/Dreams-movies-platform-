import Link from "next/link";
import type { ReactNode } from "react";

export function Arrow({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Lien « Tout voir » : la flèche avance au survol.
export function MoreLink({ href, children = "Tout voir" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="arrow-link inline-flex min-h-10 shrink-0 items-center rounded-full px-1 text-[14px] text-muted transition-colors hover:text-foreground">
      {children}
      <Arrow />
    </Link>
  );
}

/*
 * Une section de page : un filet, le titre en Bodoni, la précision (kicker) dessous en gris,
 * « Tout voir » à droite. Pas de numéro de rubrique : le contenu n'est pas une suite ordonnée.
 */
export function Section({
  title,
  kicker,
  href,
  linkLabel,
  aside,
  children,
  className = "",
}: {
  index?: number | string;
  title: ReactNode;
  kicker?: ReactNode;
  href?: string;
  linkLabel?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  reveal?: boolean;
}) {
  return (
    <section className={className} data-reveal>
      <div className="mb-6 flex items-end justify-between gap-4 border-t border-[var(--line)] pt-5 md:mb-8 md:pt-7">
        <div className="min-w-0">
          <h2 className="text-[2rem] leading-none md:text-[2.75rem]">{title}</h2>
          {kicker && <p className="mt-2.5 text-[14.5px] text-muted">{kicker}</p>}
        </div>
        {aside ?? (href && <MoreLink href={href}>{linkLabel}</MoreLink>)}
      </div>
      {children}
    </section>
  );
}
