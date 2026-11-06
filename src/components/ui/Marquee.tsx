import { Fragment } from "react";

/*
 * Bandeau défilant, comme le fronton d'un cinéma : les mots passent en boucle, séparés par une étoile.
 * Deux copies identiques défilent à la suite pour que la boucle soit invisible ; il s'arrête au survol.
 */
export function Marquee({ items, className = "", speed = 32, reverse = false }: { items: string[]; className?: string; speed?: number; reverse?: boolean }) {
  const row = (
    <div aria-hidden style={{ animationDirection: reverse ? "reverse" : undefined }}>
      {items.map((t, i) => (
        <Fragment key={i}>
          <span className="font-display px-5">{t}</span>
          <span className="px-1 text-accent">✶</span>
        </Fragment>
      ))}
    </div>
  );
  return (
    <div className={`marquee ${className}`} style={{ "--marquee-speed": `${speed}s` } as React.CSSProperties}>
      <span className="sr-only">{items.join(", ")}</span>
      {row}
      {row}
    </div>
  );
}
