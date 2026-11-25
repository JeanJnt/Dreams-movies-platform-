/*
 * Génère les icônes de l'appli pour une palette du logo : public/brand/icone<suffixe>.svg et les PNG
 * (onglet, écran d'accueil, Apple, et « maskable » pour Android, qui découpe l'icône en cercle ou en goutte).
 *   node scripts/make-icons.mjs lilas        → une palette
 *   node scripts/make-icons.mjs              → toutes
 *   node scripts/make-icons.mjs badge        → la petite icône des notifications Android (silhouette blanche)
 * Le tracé vient de src/lib/brand-path.ts ; la matière (dégradé + éclat) de PALETTES ci-dessous.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const src = readFileSync(new URL("../src/lib/brand-path.ts", import.meta.url), "utf8");
const PATH = src.match(/BRAND_PATH = "([^"]+)"/)[1];

// Huit arrêts du dégradé (comme --logo-0 à --logo-7 dans globals.css) et la force de l'éclat en haut à gauche
export const PALETTES = {
  argent: { stops: ["#8e929c", "#f4f5f8", "#b9bcc4", "#ffffff", "#7c808a", "#e6e8ed", "#9da1aa", "#eef0f4"], spec: 0.55 },
  rouge: { stops: ["#9a0712", "#ff2a37", "#c20b18", "#ff5560", "#8a0610", "#ff1f2e", "#b00915", "#ff3a46"], spec: 0.2 },
  lilas: { stops: ["#6e4fa8", "#e6d6ff", "#9b77dc", "#dcc6ff", "#5d3f95", "#c9a8ff", "#8964cc", "#ece2ff"], spec: 0.4 },
};
const OFFSETS = [0, 0.22, 0.36, 0.48, 0.56, 0.7, 0.86, 1];

// share : part de la largeur occupée par l'étoile (0,8 pour l'icône, plus de marge pour la version maskable)
function svg({ stops, spec }, share = 0.8) {
  const scale = (2048 * share) / 1658;
  const x = (2048 - 1658 * scale) / 2;
  const y = (2048 - 966 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="1024" height="1024">
  <defs>
    <linearGradient id="silver" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1658" y2="966">
${stops.map((c, i) => `      <stop offset="${OFFSETS[i]}" stop-color="${c}"/>`).join("\n")}
    </linearGradient>
    <radialGradient id="sheen" gradientUnits="userSpaceOnUse" cx="760" cy="330" r="620">
      <stop offset="0" stop-color="#ffffff" stop-opacity="${spec}"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="2048" height="2048" fill="#000000"/>
  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(4)})">
    <path fill="url(#silver)" d="${PATH}"/>
    <path fill="url(#sheen)" d="${PATH}"/>
  </g>
</svg>
`;
}

const png = (markup, size, file) => sharp(Buffer.from(markup)).resize(size, size).png().toFile(fileURLToPath(new URL(`../public/${file}`, import.meta.url)));

async function make(name) {
  const palette = PALETTES[name];
  if (!palette) throw new Error(`Palette inconnue : ${name}`);
  const r = name === "argent" ? "" : `-${name}`;
  const icon = svg(palette);
  writeFileSync(new URL(`../public/brand/icone${r}.svg`, import.meta.url), icon);
  await Promise.all([
    png(icon, 192, `icon-192${r}.png`),
    png(icon, 512, `icon-512${r}.png`),
    png(icon, 180, `apple-icon${r}.png`),
    png(svg(palette, 0.59), 512, `icon-maskable-512${r}.png`),
  ]);
  console.log(`icônes « ${name} » générées`);
}

// Android n'affiche que la silhouette de la petite icône des notifications (barre d'état) : étoile blanche sur fond transparent
async function badge() {
  const scale = (96 * 0.92) / 1658;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><g transform="translate(${((96 - 1658 * scale) / 2).toFixed(2)} ${((96 - 966 * scale) / 2).toFixed(2)}) scale(${scale.toFixed(5)})"><path fill="#ffffff" d="${PATH}"/></g></svg>`;
  await png(markup, 96, "badge-96.png");
  console.log("badge des notifications généré");
}

const names = process.argv.slice(2);
for (const name of names.length ? names : [...Object.keys(PALETTES), "badge"]) await (name === "badge" ? badge() : make(name));
