import Link from "next/link";
import type { ReactNode } from "react";

export function Arrow({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Lien « Tout voir → » dont la flèche avance au survol.
export function MoreLink({ href, children = "Tout voir" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="arrow-link shrink-0 text-sm text-muted transition-colors hover:text-accent">
      {children}
      <Arrow />
    </Link>
  );
}

/*
 * Une section de page : numéro en chasse fixe, titre, lien « Tout voir ».
 * Elle apparaît en fondu quand on l'atteint en défilant (CSS seulement).
 */
export function Section({
  index,
  title,
  kicker,
  href,
  linkLabel,
  aside,
  children,
  className = "",
  reveal = true,
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
    <section className={`${reveal ? "reveal" : ""} ${className}`}>
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
        <div className="min-w-0">
          {(index != null || kicker) && (
            <p className="eyebrow mb-2.5">
              {index != null && <span className="eyebrow-num">{String(index).padStart(2, "0")}</span>}
              {index != null && kicker && <span className="mx-2 text-border">/</span>}
              {kicker}
            </p>
          )}
          <h2 className="font-display text-[1.75rem] leading-[1.05] md:text-[2.5rem]">{title}</h2>
        </div>
        {aside ?? (href && <MoreLink href={href}>{linkLabel}</MoreLink>)}
      </div>
      {children}
    </section>
  );
}
