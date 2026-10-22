// Étiquette de disque, dessinée en SVG (400 × 400, centre 200,200).

export type DiscData = {
  id: number | string;
  title: string;
  year: number | null;
  director?: string | null;
  runtime?: number | null;
  image: string | null; // image large du film (backdrop) de préférence
  badge?: string; // format : Blu-ray, DVD…
};

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

// Une seule maquette, sobre : l'image du film sur tout le disque, assombrie en bas, le titre en blanc.
// Sans image : un disque noir, le titre seul.
export function DiscLabel({ disc }: { disc: DiscData }) {
  const uid = `disc-${String(disc.id).replace(/W/g, "")}`;
  const lines = splitTitle(disc.title);
  const longest = Math.max(...lines.map((l) => l.length));
  const titleSize = Math.min(40, Math.max(18, 280 / (longest * 0.62)));
  const meta = [disc.director, disc.year].filter(Boolean).join("  ·  ");

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
          <stop offset="0.4" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id={`${uid}-hub`}>
          <stop offset="0.5" stopColor="#f4f4f4" />
          <stop offset="0.8" stopColor="#bdbdbd" />
          <stop offset="1" stopColor="#8a8a8a" />
        </radialGradient>
      </defs>

      <g mask={`url(#${uid}-mask)`}>
        <g clipPath={`url(#${uid}-clip)`}>
          <rect width="400" height="400" fill="#111" />
          {disc.image && <image href={disc.image} x="-60" y="0" width="520" height="400" preserveAspectRatio="xMidYMid slice" />}
          <rect width="400" height="400" fill={`url(#${uid}-fade)`} />
          <text textAnchor="middle" style={display} fill="#fff" fontSize={titleSize}>
            {lines.map((l, i) => (
              <tspan key={i} x="200" y={322 - (lines.length - 1 - i) * titleSize * 0.95}>
                {l}
              </tspan>
            ))}
          </text>
          {meta && (
            <text x="200" y="346" textAnchor="middle" style={sans} fontSize="10" letterSpacing="2" fill="#ffffffbf">
              {meta.toUpperCase()}
            </text>
          )}
          {disc.badge && (
            <text x="200" y="128" textAnchor="middle" style={sans} fontSize="9" fontWeight="700" letterSpacing="3" fill="#fff">
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
