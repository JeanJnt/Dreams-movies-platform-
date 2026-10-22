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

// Le logo : un bloc noir, le 夢 et « Dreams » en rouge vif. Il reste le même quel que soit le thème.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-lg bg-[#0a0a0a] py-1 pr-3 pl-1.5 text-[#ff1a1a] ${className}`}>
      <BrushYume className="h-8 w-auto overflow-visible" />
      <span className="text-lg leading-none font-black tracking-tight uppercase">Dreams</span>
    </span>
  );
}
