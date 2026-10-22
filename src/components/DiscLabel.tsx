/*
 * Étiquette de disque, dessinée en SVG (400 × 400, centre 200,200). Quatre maquettes :
 *   - « photo » : l'image du film en plein, titre en bas
 *   - « bande » : une bande d'image en haut, aplat de couleur, titre en grand
 *   - « typo »  : tout en typographie, titre et année en contour
 *   - « duo »   : l'image en bichromie aux couleurs de l'étiquette
 * Les couleurs viennent de l'image du film (sa couleur dominante), et le texte est toujours bien lisible
 * (fond sombre et texte clair, ou l'inverse). La maquette est choisie par le membre, sinon automatiquement.
 */

export type DiscData = {
  id: number | string;
  title: string;
  year: number | null;
  director?: string | null;
  runtime?: number | null;
  image: string | null; // image large du film (backdrop) de préférence
  badge?: string; // format : Blu-ray, DVD…
  color?: string | null; // couleur dominante de l'image (#rrggbb)
  variant?: string | null; // maquette choisie par le membre
};

export const DISC_LAYOUTS = ["photo", "bande", "typo", "duo"] as const;
type Layout = (typeof DISC_LAYOUTS)[number];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
type Hsl = readonly [number, number, number];
const css = ([h, s, l]: Hsl) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
const rgb = ([h, s, l]: Hsl) => {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
};

// Palette accordée à l'image : même teinte que l'image, fond très sombre ou très clair, texte à l'opposé.
// light = false : toujours sombre (la bichromie claire délaverait l'image).
function palette(color: string | null | undefined, seed: number, light = true): { bg: Hsl; fg: Hsl; ac: Hsl } {
  if (!color) return { bg: [40, 0.3, 0.9], fg: [30, 0.2, 0.1], ac: [8, 0.7, 0.45] };
  const [h, s] = hexToHsl(color);
  const sat = Math.min(0.5, Math.max(0.12, s));
  const vivid = Math.max(0.5, Math.min(0.8, s + 0.2));
  return light && seed % 3 === 0
    ? { bg: [h, sat * 0.6, 0.9], fg: [h, 0.45, 0.13], ac: [h, vivid, 0.4] }
    : { bg: [h, sat, 0.15], fg: [h, 0.25, 0.94], ac: [h, vivid, 0.64] };
}

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
  // Choix automatique : sans image, tout en typographie ; sinon une des quatre maquettes, toujours la même pour ce film.
  const variant: Layout = DISC_LAYOUTS.includes(disc.variant as Layout) ? (disc.variant as Layout) : !disc.image ? "typo" : DISC_LAYOUTS[h % 4];
  const pal = palette(disc.color, h >>> 3, variant !== "duo");
  const p = { bg: css(pal.bg), fg: css(pal.fg), ac: css(pal.ac) };
  const [bgRgb, acRgb] = [rgb(pal.bg), rgb(pal.ac)];
  const uid = `disc-${String(disc.id).replace(/\W/g, "")}-${variant}`;
  const lines = splitTitle(disc.title);
  const longest = Math.max(...lines.map((l) => l.length));
  const titleSize = Math.min(46, Math.max(20, 300 / (longest * 0.62)));
  const meta = [disc.director, disc.year, disc.runtime ? `${disc.runtime} min` : null].filter(Boolean).join("  ·  ");
  const onImage = variant === "photo" || variant === "duo";

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
        <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`${uid}-hub`}>
          <stop offset="0.5" stopColor="#f4f4f4" />
          <stop offset="0.8" stopColor="#bdbdbd" />
          <stop offset="1" stopColor="#8a8a8a" />
        </radialGradient>
        {/* Bichromie : les ombres prennent la couleur du fond, les lumières celle de l'accent */}
        <filter id={`${uid}-duo`}>
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={`${bgRgb[0]} ${acRgb[0]}`} />
            <feFuncG type="table" tableValues={`${bgRgb[1]} ${acRgb[1]}`} />
            <feFuncB type="table" tableValues={`${bgRgb[2]} ${acRgb[2]}`} />
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
              <rect x="0" y="146" width="400" height="5" fill={p.ac} />
              {titleBlock(300, p.fg)}
              <text x="200" y="330" textAnchor="middle" style={sans} fontSize="10" letterSpacing="2" fill={p.fg} opacity="0.75">{meta.toUpperCase()}</text>
            </>
          )}

          {variant === "typo" && (
            <>
              {titleBlock(72, p.fg, true)}
              <text x="200" y="345" textAnchor="middle" style={display} fontSize="78" fill="none" stroke={p.ac} strokeWidth="1.5">{disc.year ?? ""}</text>
              <text x="200" y="268" textAnchor="middle" style={sans} fontSize="10" letterSpacing="2.5" fill={p.fg} opacity="0.75">{(disc.director ?? "").toUpperCase()}</text>
              <circle cx="200" cy="200" r="88" fill="none" stroke={p.fg} strokeWidth="0.6" opacity="0.35" />
            </>
          )}

          {variant === "duo" && (
            <>
              {disc.image && <image href={disc.image} x="-60" y="0" width="520" height="400" preserveAspectRatio="xMidYMid slice" filter={`url(#${uid}-duo)`} />}
              <rect x="40" y="262" width="320" height="76" fill={p.bg} opacity="0.9" />
              {titleBlock(308, p.fg)}
              <text x="200" y="330" textAnchor="middle" style={sans} fontSize="9" letterSpacing="2" fill={p.ac}>{meta.toUpperCase()}</text>
            </>
          )}

          {disc.badge && (
            <text x="200" y="128" textAnchor="middle" style={sans} fontSize="9" fontWeight="700" letterSpacing="3" fill={onImage ? "#fff" : p.ac}>
              {disc.badge.toUpperCase()}
            </text>
          )}
        </g>

        {/* Zone transparente et moyeu métallique du disque */}
        <circle cx="200" cy="200" r="70" fill="#ffffff" opacity="0.18" />
        <circle cx="200" cy="200" r="46" fill={`url(#${uid}-hub)`} />
        <circle cx="200" cy="200" r="198.5" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
