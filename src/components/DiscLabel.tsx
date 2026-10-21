/*
 * Gabarit d'étiquette de DVD, dessiné en SVG (400 × 400, centre 200,200).
 * Quatre maquettes, choisies selon le film, pour qu'une collection ressemble à une vraie étagère d'éditions :
 *   - « photo »  : l'image du film en plein, titre en bas (façon édition collector)
 *   - « bande »  : une bande d'image en haut, aplat de couleur, titre en grand
 *   - « typo »   : tout en typographie, titre géant et année en contour
 *   - « duo »    : l'image en bichromie aux couleurs de l'étiquette
 */

export type DiscData = {
  id: number | string;
  title: string;
  year: number | null;
  director?: string | null;
  runtime?: number | null;
  image: string | null; // image large du film (backdrop) de préférence
  badge?: string; // format : Blu-ray, DVD…
};

const PALETTES = [
  { bg: "#f2ead8", fg: "#141210", ac: "#c8321f" }, // papier et vermillon
  { bg: "#111111", fg: "#f2ead8", ac: "#f2c230" }, // noir et or
  { bg: "#1b3a6b", fg: "#f6efe0", ac: "#f2c230" }, // bleu de cobalt
  { bg: "#8c1c13", fg: "#f6efe0", ac: "#f2c230" }, // rouge sang
  { bg: "#2f5d50", fg: "#f6efe0", ac: "#e8b04a" }, // vert céladon
];
const VARIANTS = ["photo", "bande", "typo", "duo"] as const;

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Coupe le titre en lignes courtes pour qu'il tienne au-dessus ou en dessous du moyeu.
function splitTitle(title: string, max = 13) {
  const lines: string[] = [];
  for (const word of title.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= max) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  return lines.slice(0, 3);
}

const display = { fontFamily: "var(--display), serif", fontWeight: "var(--display-weight)" as unknown as number };
const sans = { fontFamily: "var(--font-geist-sans), sans-serif" };

export function DiscLabel({ disc }: { disc: DiscData }) {
  const h = hash(`${disc.id}${disc.title}`);
  const variant = VARIANTS[h % VARIANTS.length];
  const p = PALETTES[(h >>> 3) % PALETTES.length];
  const uid = `disc-${String(disc.id).replace(/\W/g, "")}`;
  const lines = splitTitle(disc.title);
  const longest = Math.max(...lines.map((l) => l.length));
  const titleSize = Math.min(46, Math.max(20, 300 / (longest * 0.62)));
  const catalog = `N° ${String(disc.id).padStart(4, "0")}`;
  const ring = [disc.title, disc.director, disc.year, "Dreams · Collection", catalog].filter(Boolean).join("  ✦  ").toUpperCase();
  const ringText = `${ring}  ✦  ${ring}  ✦  ${ring}`;
  const meta = [disc.director, disc.year, disc.runtime ? `${disc.runtime} min` : null].filter(Boolean).join("  ·  ");

  const titleBlock = (y: number, fill: string, anchorTop = false) => (
    <text textAnchor="middle" style={display} fill={fill} fontSize={titleSize}>
      {lines.map((l, i) => (
        <tspan key={i} x="200" y={anchorTop ? y + i * titleSize * 0.95 : y - (lines.length - 1 - i) * titleSize * 0.95}>
          {l}
        </tspan>
      ))}
    </text>
  );

  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <circle cx="200" cy="200" r="199" />
        </clipPath>
        {/* Le trou central est vraiment transparent */}
        <mask id={`${uid}-mask`}>
          <circle cx="200" cy="200" r="199" fill="white" />
          <circle cx="200" cy="200" r="19" fill="black" />
        </mask>
        <path id={`${uid}-ring`} d="M200,200 m-181,0 a181,181 0 1,1 362,0 a181,181 0 1,1 -362,0" />
        <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`${uid}-hub`}>
          <stop offset="0.5" stopColor="#f4f4f4" />
          <stop offset="0.8" stopColor="#bdbdbd" />
          <stop offset="1" stopColor="#8a8a8a" />
        </radialGradient>
        <filter id={`${uid}-duo`}>
          {/* Bichromie : les ombres prennent la couleur du fond, les lumières celle de l'accent */}
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${parseInt(p.bg.slice(1, 3), 16) / 255} ${parseInt(p.ac.slice(1, 3), 16) / 255}`} />
            <feFuncG type="table" tableValues={`${parseInt(p.bg.slice(3, 5), 16) / 255} ${parseInt(p.ac.slice(3, 5), 16) / 255}`} />
            <feFuncB type="table" tableValues={`${parseInt(p.bg.slice(5, 7), 16) / 255} ${parseInt(p.ac.slice(5, 7), 16) / 255}`} />
          </feComponentTransfer>
        </filter>
      </defs>

      <g mask={`url(#${uid}-mask)`}>
        <g clipPath={`url(#${uid}-clip)`}>
          <rect width="400" height="400" fill={p.bg} />

          {variant === "photo" && (
            <>
              {disc.image && <image href={disc.image} x="-60" y="0" width="520" height="400" preserveAspectRatio="xMidYMid slice" />}
              <rect width="400" height="400" fill={`url(#${uid}-fade)`} />
              {titleBlock(318, "#fff")}
              <text x="200" y="342" textAnchor="middle" style={sans} fontSize="10" letterSpacing="2" fill="#ffffffcc">{meta.toUpperCase()}</text>
            </>
          )}

          {variant === "bande" && (
            <>
              {disc.image && <image href={disc.image} x="0" y="0" width="400" height="150" preserveAspectRatio="xMidYMid slice" />}
              <rect x="0" y="146" width="400" height="6" fill={p.ac} />
              {titleBlock(300, p.fg)}
              <text x="200" y="330" textAnchor="middle" style={sans} fontSize="10" letterSpacing="2" fill={p.fg} opacity="0.75">{meta.toUpperCase()}</text>
              <circle cx="200" cy="200" r="92" fill="none" stroke={p.ac} strokeWidth="1.2" />
            </>
          )}

          {variant === "typo" && (
            <>
              {titleBlock(72, p.fg, true)}
              <text x="200" y="345" textAnchor="middle" style={display} fontSize="78" fill="none" stroke={p.ac} strokeWidth="1.5">{disc.year ?? ""}</text>
              <text x="200" y="268" textAnchor="middle" style={sans} fontSize="10" letterSpacing="2.5" fill={p.fg} opacity="0.75">{(disc.director ?? "").toUpperCase()}</text>
              <circle cx="200" cy="200" r="86" fill="none" stroke={p.fg} strokeWidth="0.6" opacity="0.4" />
              <circle cx="200" cy="200" r="91" fill="none" stroke={p.fg} strokeWidth="0.6" opacity="0.4" />
            </>
          )}

          {variant === "duo" && (
            <>
              {disc.image && <image href={disc.image} x="-60" y="0" width="520" height="400" preserveAspectRatio="xMidYMid slice" filter={`url(#${uid}-duo)`} />}
              <rect x="40" y="262" width="320" height="76" fill={p.bg} opacity="0.88" />
              {titleBlock(308, p.fg)}
              <text x="200" y="330" textAnchor="middle" style={sans} fontSize="9" letterSpacing="2" fill={p.ac}>{meta.toUpperCase()}</text>
            </>
          )}

          {/* Texte qui court autour du disque */}
          <text style={sans} fontSize="8.5" letterSpacing="2.2" fill={variant === "photo" || variant === "duo" ? "#ffffffd9" : p.fg} opacity="0.85">
            <textPath href={`#${uid}-ring`} startOffset="0">{ringText}</textPath>
          </text>
          {disc.badge && (
            <text x="200" y="128" textAnchor="middle" style={sans} fontSize="9" fontWeight="700" letterSpacing="3" fill={variant === "photo" || variant === "duo" ? "#fff" : p.ac}>
              {disc.badge.toUpperCase()}
            </text>
          )}
        </g>

        {/* Zone transparente et moyeu métallique du disque */}
        <circle cx="200" cy="200" r="70" fill="#ffffff" opacity="0.18" />
        <circle cx="200" cy="200" r="70" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="200" cy="200" r="46" fill={`url(#${uid}-hub)`} />
        <circle cx="200" cy="200" r="30" fill="none" stroke="#00000033" strokeWidth="1" />
        <circle cx="200" cy="200" r="198.5" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
