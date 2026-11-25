/*
 * Génère le logo et les icônes de l'appli à partir du tracé unique (src/lib/brand-path.ts) :
 * - public/brand/icone.svg, icone-rouge.svg, icone-lilas.svg, logo-blanc.svg ;
 * - public/icon-192, icon-512, icon-maskable-512, apple-icon (.png), en argent, en rouge et en lilas.
 * Lisibilité en petit : barre centrale épaissie (dans le tracé), fin contour à angles vifs (les pointes restent pointues),
 * logo agrandi dans le cadre et métal éclairci pour ne pas se fondre dans le fond noir.
 * Usage : npm run icons
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { BRAND_PATH } from "../src/lib/brand-path";

const PUBLIC = path.join(process.cwd(), "public");
const OFFSETS = [0, 0.22, 0.36, 0.48, 0.56, 0.7, 0.86, 1];
const STROKE = 22; // épaisseur du contour, en unités du tracé (1658 × 966)

const THEMES = {
  "": { stops: ["#b8bcc4", "#ffffff", "#d4d7dd", "#ffffff", "#a9adb6", "#f2f3f6", "#c3c6cd", "#ffffff"], sheen: 0.45 },
  "-rouge": { stops: ["#c8141f", "#ff3a46", "#e01a27", "#ff6a73", "#b81019", "#ff3341", "#d8121f", "#ff4f5a"], sheen: 0.2 },
  "-lilas": { stops: ["#9475cf", "#e6d6ff", "#b597ea", "#dcc6ff", "#8667c2", "#c9a8ff", "#a786e0", "#ece2ff"], sheen: 0.4 },
};

// Le logo centré dans un carré de 2048, à l'échelle k (1 = largeur du tracé, 1658 unités).
function icon(theme: keyof typeof THEMES, k: number) {
  const { stops, sheen } = THEMES[theme];
  const tx = +(1024 - 829 * k).toFixed(1);
  const ty = +(1024 - 483 * k).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="1024" height="1024">
  <defs>
    <linearGradient id="silver" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1658" y2="966">
${stops.map((c, i) => `      <stop offset="${OFFSETS[i]}" stop-color="${c}"/>`).join("\n")}
    </linearGradient>
    <radialGradient id="sheen" gradientUnits="userSpaceOnUse" cx="760" cy="330" r="620">
      <stop offset="0" stop-color="#ffffff" stop-opacity="${sheen}"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="2048" height="2048" fill="#000000"/>
  <g transform="translate(${tx} ${ty}) scale(${k})">
    <path fill="url(#silver)" stroke="url(#silver)" stroke-width="${STROKE}" stroke-linejoin="miter" stroke-miterlimit="4" d="${BRAND_PATH}"/>
    <path fill="url(#sheen)" d="${BRAND_PATH}"/>
  </g>
</svg>
`;
}

const white = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 1682 990" width="1682" height="990">
  <path fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${STROKE}" stroke-linejoin="miter" stroke-miterlimit="4" d="${BRAND_PATH}"/>
</svg>
`;

const png = (svg: string, size: number, file: string) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 1024) * 2 }).resize(size, size).png().toFile(path.join(PUBLIC, file));

async function main() {
  fs.writeFileSync(path.join(PUBLIC, "brand/logo-blanc.svg"), white);
  for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
    const main = icon(theme, 1.12);
    // Icône « maskable » : Android peut la rogner en cercle, le logo reste dans la zone sûre (80 % du centre).
    const maskable = icon(theme, 0.92);
    fs.writeFileSync(path.join(PUBLIC, `brand/icone${theme}.svg`), main);
    await png(main, 512, `icon-512${theme}.png`);
    await png(main, 192, `icon-192${theme}.png`);
    await png(main, 180, `apple-icon${theme}.png`);
    await png(maskable, 512, `icon-maskable-512${theme}.png`);
  }
  console.log("Logo et icônes générés.");
}

main();
