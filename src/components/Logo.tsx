import { useId } from "react";
import { BRAND_PATH, BRAND_VIEWBOX } from "@/lib/brand-path";

/*
 * Le logo de Dreams Movies : l'étoile entre deux croissants (tracé d'origine, public/brand/logo-blanc.svg),
 * en argent poli (thème noir et blanc) ou en rouge laqué (thème noir et rouge : variables --logo-0 à --logo-7). Le métal est fait de trois couches : un dégradé argent (variations de lumière),
 * un éclat spéculaire en haut à gauche, et un reflet qui balaie la surface au survol.
 * Le tracé n'est jamais déformé : seul le remplissage change.
 */
export function BrandMark({ className = "", title = "Dreams Movies" }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox={BRAND_VIEWBOX} className={`brand-mark ${className}`} role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}-silver`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1658" y2="966">
          <stop offset="0" style={{ stopColor: "var(--logo-0, #8e929c)" }} />
          <stop offset="0.22" style={{ stopColor: "var(--logo-1, #f4f5f8)" }} />
          <stop offset="0.36" style={{ stopColor: "var(--logo-2, #b9bcc4)" }} />
          <stop offset="0.48" style={{ stopColor: "var(--logo-3, #ffffff)" }} />
          <stop offset="0.56" style={{ stopColor: "var(--logo-4, #7c808a)" }} />
          <stop offset="0.7" style={{ stopColor: "var(--logo-5, #e6e8ed)" }} />
          <stop offset="0.86" style={{ stopColor: "var(--logo-6, #9da1aa)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-7, #eef0f4)" }} />
        </linearGradient>
        <radialGradient id={`${id}-spec`} gradientUnits="userSpaceOnUse" cx="760" cy="300" r="620">
          <stop offset="0" stopColor="#fff" style={{ stopOpacity: "var(--logo-spec, 0.55)" }} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={BRAND_PATH} />
        </clipPath>
      </defs>
      <path d={BRAND_PATH} fill={`url(#${id}-silver)`} />
      <path d={BRAND_PATH} fill={`url(#${id}-spec)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect className="brand-sweep" x="-500" y="-100" width="420" height="1200" fill={`url(#${id}-sweep)`} transform="skewX(-18)" />
      </g>
    </svg>
  );
}

// L'icône : le logo argent dans un écrin noir absolu, bordure translucide et ombre douce.
export function BrandIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`brand-icon ${className}`} style={{ width: size, height: size }}>
      <BrandMark className="w-[72%]" />
    </span>
  );
}

// Le logotype complet : l'icône, puis « Dreams » en Bodoni et « Movies » en capitales Jost.
export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean; tone?: string }) {
  return (
    <span className={`group/logo inline-flex items-center gap-3 ${className}`}>
      <BrandIcon size={compact ? 34 : 38} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.45rem] tracking-[-0.02em]">Dreams</span>
          <span className="mt-[3px] text-[0.58rem] font-medium tracking-[0.42em] text-muted uppercase">Movies</span>
        </span>
      )}
    </span>
  );
}

// Compatibilité : l'ancien pinceau 夢 est remplacé partout par l'étoile
export const BrushYume = BrandMark;
