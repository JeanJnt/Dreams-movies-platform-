import { LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo-path";

// Le kanji 夢 (yume, « rêve ») tracé au pinceau, en hommage aux Rêves de Kurosawa.
// Le filtre déforme légèrement les bords pour imiter l'encre d'un pinceau sec.
export function BrushYume({ className = "", title = "夢" }: { className?: string; title?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label={title} fill="currentColor">
      <defs>
        <filter id="dry-brush" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <path d={LOGO_PATH} filter="url(#dry-brush)" transform="skewX(-5) translate(40 0)" />
    </svg>
  );
}

// Le logo du site suit le thème (le 夢 dans la couleur d'accent). L'icône de l'appli, elle, est noire et rouge.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrushYume className="h-8 w-auto overflow-visible text-accent" />
      <span className="font-display text-xl leading-none">Dreams</span>
    </span>
  );
}
