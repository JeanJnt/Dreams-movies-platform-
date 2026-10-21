/**
 * Génère le logo 夢 à partir de la police au pinceau Yuji Boku (licence SIL OFL).
 *
 *   curl -L -o scripts/assets/YujiBoku-Regular.ttf https://github.com/google/fonts/raw/main/ofl/yujiboku/YujiBoku-Regular.ttf
 *   npx tsx scripts/make-logo.ts
 *
 * Produit src/lib/logo-path.ts (le tracé, utilisé par le composant Logo) et les icônes de l'appli.
 */
import fs from "node:fs";
import opentype from "opentype.js";
import sharp from "sharp";

const buf = fs.readFileSync("scripts/assets/YujiBoku-Regular.ttf");
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const glyph = font.charToGlyph("夢");
const size = 1000;
const path = glyph.getPath(0, 0, size);
const box = path.getBoundingBox();
const w = box.x2 - box.x1, h = box.y2 - box.y1;

// On recadre le tracé sur (0,0) pour qu'il tienne pile dans son viewBox.
const shifted = glyph.getPath(-box.x1, -box.y1, size);
const d = shifted.toPathData(1);
const viewBox = `0 0 ${Math.ceil(w)} ${Math.ceil(h)}`;

fs.writeFileSync(
  "src/lib/logo-path.ts",
  `// Généré par scripts/make-logo.ts — ne pas modifier à la main.\nexport const LOGO_VIEWBOX = "${viewBox}";\nexport const LOGO_PATH = "${d}";\n`,
);

// Effet « pinceau sec » : bords irréguliers grâce à un bruit qui déforme légèrement le tracé.
const brushFilter = `
  <filter id="brush" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="7" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;

// Icône : le 夢 noir sur fond papier washi, avec un sceau vermillon.
const pad = 120, S = 1024;
const scale = (S - pad * 2) / Math.max(w, h);
const tx = (S - w * scale) / 2, ty = (S - h * scale) / 2 - 20;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
  <defs>${brushFilter}</defs>
  <rect width="${S}" height="${S}" rx="224" fill="#efe8dc"/>
  <g filter="url(#brush)"><path transform="translate(${tx} ${ty}) skewX(-5) translate(40 0) scale(${scale})" d="${d}" fill="#141210"/></g>
  <rect x="${S - 250}" y="${S - 250}" width="120" height="120" rx="16" fill="#e2492f"/>
</svg>`;
fs.writeFileSync("public/icon.svg", icon);
fs.writeFileSync("src/app/icon.svg", icon);

Promise.all(
  ([[192, "public/icon-192.png"], [512, "public/icon-512.png"], [180, "src/app/apple-icon.png"]] as const).map(([s, out]) =>
    sharp(Buffer.from(icon)).resize(s, s).png().toFile(out),
  ),
).then(() => console.log(`✅ Logo généré (${glyph.name ?? "夢"}, ${d.length} caractères de tracé)`));
