import * as THREE from "three";
import { EDITIONS, type EditionKey, type JacketTemplate } from "./editions";

/*
 * L'imprimerie des boîtiers : toutes les surfaces imprimées, dessinées dans des canevas à partir des vraies
 * données du film (affiche, image, synopsis, réalisateur, distribution, durée, pays).
 *   jaquette complète (dos | tranche | face) pour les boîtiers à fourreau plastique, comme une vraie jaquette dépliée
 *   faces séparées pour le steelbook, le fourreau collector et le digipak
 *   étiquettes de disque
 * Les images TMDB passent par /api/img (même origine), sinon WebGL ne peut pas lire leurs pixels.
 */

export type CaseFilm = {
  id: number;
  title: string;
  originalTitle?: string | null;
  year: number | null;
  director?: string | null;
  poster: string | null;
  backdrop: string | null;
  overview?: string | null;
  runtime?: number | null;
  cast?: string[];
  genres?: string[];
  countries?: string[];
  color?: string | null; // couleur dominante de l'image du film (films.disc_color)
  href: string;
};

export function imageUrl(path: string | null, size: "w342" | "w500" | "w780" | "w1280" = "w780") {
  if (!path) return null;
  if (path.startsWith("/media/") || path.startsWith("http") || path.startsWith("data:")) return path;
  return `/api/img?s=${size}&p=${encodeURIComponent(path)}`;
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
export function loadImage(src: string | null) {
  if (!src) return Promise.resolve(null);
  if (!cache.has(src))
    cache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  return cache.get(src)!;
}

// Polices de l'appli (next/font) : leurs noms réels sont dans les variables CSS
function family(v: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;
}
export const FONTS = {
  get display() { return family("--font-bodoni", "Didot, Georgia, serif"); },
  get sans() { return family("--font-geist-sans", "Helvetica, Arial, sans-serif"); },
  get mono() { return family("--font-geist-mono", "monospace"); },
};
let fontsP: Promise<unknown> | null = null;
export function fontsReady() {
  fontsP ??= Promise.all([
    document.fonts.load(`400 80px ${FONTS.display}`),
    document.fonts.load(`italic 400 80px ${FONTS.display}`),
    document.fonts.load(`700 80px ${FONTS.display}`),
    document.fonts.load(`500 30px ${FONTS.sans}`),
    document.fonts.load(`700 30px ${FONTS.sans}`),
    document.fonts.load(`500 20px ${FONTS.mono}`),
  ]).catch(() => null);
  return fontsP;
}

export function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.round(w);
  c.height = Math.round(h);
  return [c, c.getContext("2d")!] as const;
}

export function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// --- Outils de mise en page ---
export function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, fx = 0.5, fy = 0.5) {
  const r = Math.max(w / img.width, h / img.height);
  const sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.width - sw) * fx, (img.height - sh) * fy, sw, sh, x, y, w, h);
}
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, font: (s: number) => string, min = 8) {
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > maxW && s > min) {
    s -= 1;
    ctx.font = font(s);
  }
  return s;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 12) {
  const words = text.split(/\s+/);
  let line = "", n = 0;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(n === maxLines - 1 ? line + " …" : line, x, y + n * lh);
      if (++n >= maxLines) return n;
      line = w;
    } else line = t;
  }
  if (line) ctx.fillText(line, x, y + n * lh), n++;
  return n;
}
const hex = (c: string | null | undefined, f = "#3a3530") => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : f);
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function lum(c: string) {
  const n = parseInt(hex(c).slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
// Couleur de la jaquette : celle du film, assombrie pour rester élégante et lisible
export function printColor(film: CaseFilm) {
  const c = hex(film.color, "#2b2622");
  return lum(c) > 0.45 ? mix(c, "#141210", 0.55) : mix(c, "#0e0d0c", 0.25);
}
const num = (id: number) => String(id).padStart(3, "0");
const credits = (f: CaseFilm) => (f.director ? `UN FILM DE ${f.director.toUpperCase()}` : "");

// Code-barres EAN-13 plausible, tiré de l'identifiant (le vrai EAN s'il est connu ailleurs)
function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 8, y - 8, w + 16, h + 30);
  ctx.fillStyle = "#111";
  let r = seed * 9301 + 49297;
  let cx = x;
  while (cx < x + w) {
    r = (r * 9301 + 49297) % 233280;
    const bw = 1 + (r % 3);
    if (r % 2) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1;
  }
  ctx.font = `500 ${Math.round(h * 0.22)}px ${FONTS.mono}`;
  ctx.textAlign = "center";
  ctx.fillText(`3 ${String(5000000 + seed * 37).slice(0, 6)} ${String(100000 + seed * 13).slice(0, 6)}`, x + w / 2, y + h + h * 0.24);
}

// Petit sceau 夢 de la marque
function seal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.arc(x, y, s / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `700 ${s * 0.56}px ${FONTS.display}, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("夢", x, y + s * 0.03);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Jaquette complète : dos | tranche | face                             */
/* ------------------------------------------------------------------ */
export async function jacket(film: CaseFilm, edition: EditionKey, template: JacketTemplate = "affiche", layout?: { fw: number; sw: number; h: number }) {
  await fontsReady();
  const E = EDITIONS[edition];
  const px = 760; // pixels par unité (1 unité = 10 cm)
  const fw = layout?.fw ?? E.w * px, sw = layout?.sw ?? E.d * px * 1.15, h = layout?.h ?? E.h * px;
  const [c, ctx] = canvas(fw * 2 + sw, h);
  const [poster, still] = await Promise.all([loadImage(imageUrl(film.poster, "w780")), loadImage(imageUrl(film.backdrop, "w1280"))]);
  const base = printColor(film);
  const prestige = edition === "prestige";
  const paper = "#efebe3";

  // --- Fond général
  ctx.fillStyle = prestige ? paper : base;
  ctx.fillRect(0, 0, c.width, h);

  // --- FACE (à droite)
  const fx = fw + sw;
  if (prestige) {
    // Édition de prestige : composition éditoriale, image centrée, titre en capitales espacées
    ctx.fillStyle = paper;
    ctx.fillRect(fx, 0, fw, h);
    const m = fw * 0.11;
    const img = still ?? poster;
    if (img) cover(ctx, img, fx + m, h * 0.17, fw - m * 2, h * 0.5);
    ctx.fillStyle = "#1a1714";
    ctx.textAlign = "left";
    ctx.font = `500 ${fw * 0.03}px ${FONTS.mono}`;
    ctx.fillText(`N° ${num(film.id)}`, fx + m, h * 0.1);
    ctx.textAlign = "right";
    ctx.fillText("DREAMS COLLECTION", fx + fw - m, h * 0.1);
    ctx.textAlign = "left";
    const title = film.title;
    fit(ctx, title, fw - m * 2, fw * 0.12, (s) => `400 ${s}px ${FONTS.display}`);
    ctx.fillText(title, fx + m, h * 0.77);
    ctx.font = `italic 400 ${fw * 0.045}px ${FONTS.display}`;
    ctx.fillStyle = "#5a534a";
    ctx.fillText(`${film.director ?? ""}${film.year ? ", " + film.year : ""}`, fx + m, h * 0.82);
    ctx.fillStyle = "#1a1714";
    ctx.fillRect(fx + m, h * 0.9, fw - m * 2, 2);
    seal(ctx, fx + fw - m - fw * 0.04, h * 0.94, fw * 0.07, "#1a1714");
  } else {
    if (poster) cover(ctx, poster, fx, 0, fw, h);
    else {
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      fit(ctx, film.title, fw * 0.8, fw * 0.14, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(film.title, fx + fw / 2, h / 2);
    }
    if (template === "edition") {
      // Mise en page éditoriale : aplat de la couleur du film, image cadrée, titre composé
      ctx.fillStyle = base;
      ctx.fillRect(fx, 0, fw, h);
      const m2 = fw * 0.09;
      if (still ?? poster) cover(ctx, (still ?? poster)!, fx + m2, h * 0.2, fw - m2 * 2, h * 0.44, 0.5, 0.45);
      ctx.fillStyle = "#f3eee6";
      ctx.textAlign = "left";
      ctx.font = `500 ${fw * 0.028}px ${FONTS.mono}`;
      ctx.fillText((film.director ?? "").toUpperCase(), fx + m2, h * 0.12);
      ctx.fillText(String(film.year ?? ""), fx + fw - m2 - ctx.measureText(String(film.year ?? "")).width, h * 0.12);
      ctx.fillRect(fx + m2, h * 0.14, fw - m2 * 2, 2);
      fit(ctx, film.title, fw - m2 * 2, fw * 0.13, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(film.title, fx + m2, h * 0.76);
      ctx.font = `italic 400 ${fw * 0.04}px ${FONTS.display}`;
      ctx.globalAlpha = 0.75;
      ctx.fillText(film.originalTitle && film.originalTitle !== film.title ? film.originalTitle : (film.genres ?? []).slice(0, 2).join(" · "), fx + m2, h * 0.81);
      ctx.globalAlpha = 1;
    } else if (template === "minimal") {
      // Minimal : la couleur du film, un titre monumental, une vignette
      ctx.fillStyle = mix(hex(film.color, "#3a3530"), "#0e0d0c", 0.1);
      ctx.fillRect(fx, 0, fw, h);
      const m2 = fw * 0.08;
      ctx.fillStyle = lum(hex(film.color)) > 0.55 ? "#14110e" : "#f3eee6";
      ctx.textAlign = "left";
      let y2 = h * 0.16;
      for (const wd of film.title.split(" ").slice(0, 4)) {
        const s = fit(ctx, wd, fw - m2 * 2, fw * 0.24, (s2) => `400 ${s2}px ${FONTS.display}`);
        ctx.fillText(wd, fx + m2, y2 + s * 0.78);
        y2 += s * 0.9;
      }
      if (poster) cover(ctx, poster, fx + fw - m2 - fw * 0.3, h * 0.7, fw * 0.3, fw * 0.45);
      ctx.font = `500 ${fw * 0.026}px ${FONTS.mono}`;
      ctx.fillText(`${(film.director ?? "").toUpperCase()}`, fx + m2, h * 0.93);
    }
    if (E.banner) {
      // Bandeau du format en tête (Blu-ray : bleu, 4K : noir)
      const bh = h * 0.075;
      const g = ctx.createLinearGradient(0, 0, 0, bh);
      g.addColorStop(0, mix(E.banner, "#ffffff", 0.18));
      g.addColorStop(1, E.banner);
      ctx.fillStyle = g;
      ctx.fillRect(fx, 0, fw, bh);
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.font = `700 ${bh * 0.42}px ${FONTS.sans}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(E.bannerText!, fx + fw / 2, bh * 0.52);
      ctx.textBaseline = "alphabetic";
    } else {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.font = `700 ${fw * 0.032}px ${FONTS.sans}`;
      ctx.textAlign = "right";
      ctx.fillText("DVD", fx + fw - fw * 0.05, h - fw * 0.05);
    }
  }

  // --- TRANCHE (au milieu)
  const sx = fw;
  ctx.save();
  ctx.fillStyle = prestige ? paper : base;
  ctx.fillRect(sx, 0, sw, h);
  if (E.banner && !prestige) {
    ctx.fillStyle = E.banner;
    ctx.fillRect(sx, 0, sw, h * 0.09);
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${sw * 0.26}px ${FONTS.sans}`;
    ctx.textAlign = "center";
    ctx.fillText(E.bannerShort!, sx + sw / 2, h * 0.055);
  }
  if (prestige) {
    ctx.fillStyle = "#1a1714";
    ctx.textAlign = "center";
    ctx.font = `400 ${sw * 0.46}px ${FONTS.display}`;
    ctx.fillText(num(film.id), sx + sw / 2, h * 0.075);
    ctx.fillRect(sx + sw * 0.25, h * 0.1, sw * 0.5, 2);
  }
  ctx.translate(sx + sw / 2, h * 0.88);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = prestige ? "#1a1714" : "#f3eee6";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const st = prestige ? film.title.toUpperCase() : film.title;
  const s1 = fit(ctx, st, h * 0.56, sw * 0.5, (s) => (prestige ? `500 ${s}px ${FONTS.sans}` : `400 ${s}px ${FONTS.display}`));
  ctx.fillText(st, 0, 0);
  const tw = ctx.measureText(st).width;
  ctx.font = `500 ${Math.min(s1 * 0.62, sw * 0.28)}px ${FONTS.mono}`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(`${film.director ?? ""}  ${film.year ?? ""}`.trim(), tw + sw * 0.45, 2);
  ctx.restore();
  seal(ctx, sx + sw / 2, h * 0.94, sw * 0.62, prestige ? "#1a1714" : "rgba(243,238,230,.9)");

  // --- DOS (à gauche)
  const m = fw * 0.075;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const ink = prestige ? "#1a1714" : "#f3eee6";
  const soft = prestige ? "#5a534a" : "rgba(243,238,230,.72)";
  if (!prestige) {
    // l'image du film en fond, assombrie vers le bas
    if (still) {
      cover(ctx, still, 0, 0, fw, h * 0.52, 0.5, 0.35);
      const g = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.52);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, base);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, fw, h * 0.53);
    }
    if (E.banner) {
      ctx.fillStyle = E.banner;
      ctx.fillRect(0, 0, fw, h * 0.075);
    }
  }
  ctx.fillStyle = ink;
  let y = prestige ? h * 0.12 : h * 0.47;
  fit(ctx, film.title, fw - m * 2, fw * 0.085, (s) => `400 ${s}px ${FONTS.display}`);
  ctx.fillText(film.title, m, y);
  y += fw * 0.05;
  ctx.font = `italic 400 ${fw * 0.034}px ${FONTS.display}`;
  ctx.fillStyle = soft;
  ctx.fillText([film.originalTitle && film.originalTitle !== film.title ? film.originalTitle : null, film.year].filter(Boolean).join(" · "), m, y);
  if (prestige && still) {
    y += fw * 0.04;
    cover(ctx, still, m, y, fw - m * 2, h * 0.24, 0.5, 0.5);
    y += h * 0.24 + fw * 0.07;
  } else y += fw * 0.075;
  ctx.fillStyle = ink;
  ctx.font = `400 ${fw * 0.03}px ${FONTS.sans}`;
  const lines = wrap(ctx, film.overview || "Synopsis indisponible.", m, y, fw - m * 2, fw * 0.043, prestige ? 7 : 9);
  y += lines * fw * 0.043 + fw * 0.05;
  // vignettes : trois cadrages de l'image du film
  if (still && !prestige) {
    const tw2 = (fw - m * 2 - fw * 0.04) / 3;
    [0.15, 0.5, 0.85].forEach((f, i) => cover(ctx, still, m + i * (tw2 + fw * 0.02), y, tw2, tw2 * 0.56, f, 0.5));
    y += tw2 * 0.56 + fw * 0.06;
  }
  // bloc de générique condensé
  ctx.fillStyle = soft;
  ctx.font = `500 ${fw * 0.018}px ${FONTS.sans}`;
  const billing = [credits(film), film.cast?.length ? "AVEC " + film.cast.slice(0, 5).join("  ").toUpperCase() : "", film.countries?.length ? film.countries.join(" · ").toUpperCase() : ""].filter(Boolean).join("   ");
  wrap(ctx, billing, m, h * 0.83, fw - m * 2, fw * 0.025, 3);
  // caractéristiques techniques
  ctx.fillStyle = ink;
  ctx.font = `500 ${fw * 0.022}px ${FONTS.mono}`;
  const specs = [film.runtime ? `${film.runtime} MIN` : null, E.specs, "VOST FR", "COULEUR"].filter(Boolean).join("   ·   ");
  ctx.fillText(specs, m, h * 0.91);
  barcode(ctx, fw - m - fw * 0.22, h * 0.885, fw * 0.22, h * 0.045, film.id);
  seal(ctx, m + fw * 0.03, h * 0.955, fw * 0.06, ink);
  ctx.font = `500 ${fw * 0.02}px ${FONTS.mono}`;
  ctx.fillText(`DREAMS MOVIES  ·  ${edition === "prestige" ? "COLLECTION N° " + num(film.id) : E.label.toUpperCase()}`, m + fw * 0.08, h * 0.96);

  return { texture: toTexture(c), fw, sw, total: c.width };
}

/* ------------------------------------------------------------------ */
/* Steelbook : face, dos, intérieur (impression directe sur le métal)   */
/* ------------------------------------------------------------------ */
export async function steelArt(film: CaseFilm) {
  await fontsReady();
  const E = EDITIONS.steelbook;
  const px = 760, w = E.w * px, h = E.h * px;
  const [poster, still] = await Promise.all([loadImage(imageUrl(film.poster, "w780")), loadImage(imageUrl(film.backdrop, "w1280"))]);
  const base = printColor(film);
  // Face : l'image du film recadrée, en bichromie (encre de la couleur du film + argent du métal), titre gravé
  const face = canvas(w, h);
  const f = face[1];
  f.fillStyle = "#bfc3c7";
  f.fillRect(0, 0, w, h);
  if (still) {
    f.save();
    f.filter = "grayscale(1) contrast(1.2) brightness(1.35)";
    cover(f, still, 0, 0, w, h, 0.42, 0.5);
    f.restore();
    f.globalCompositeOperation = "multiply";
    f.fillStyle = mix(hex(film.color, "#5a2a2a"), "#ffffff", 0.35);
    f.fillRect(0, 0, w, h);
    f.globalCompositeOperation = "source-over";
  }
  f.fillStyle = "rgba(235,236,238,.92)";
  f.textAlign = "center";
  fit(f, film.title.toUpperCase(), w * 0.8, w * 0.1, (s) => `400 ${s}px ${FONTS.display}`);
  f.fillText(film.title.toUpperCase(), w / 2, h * 0.88);
  f.font = `500 ${w * 0.025}px ${FONTS.mono}`;
  f.fillText(`${film.director?.toUpperCase() ?? ""}  ·  ${film.year ?? ""}`, w / 2, h * 0.92);
  // Masque métal : là où l'encre est claire, on laisse voir le métal brut (plus brillant)
  const back = canvas(w, h);
  const b = back[1];
  b.fillStyle = base;
  b.fillRect(0, 0, w, h);
  if (poster) {
    b.globalAlpha = 0.9;
    cover(b, poster, w * 0.12, h * 0.1, w * 0.76, h * 0.62);
    b.globalAlpha = 1;
  }
  b.fillStyle = "rgba(235,236,238,.85)";
  b.font = `500 ${w * 0.024}px ${FONTS.mono}`;
  b.textAlign = "center";
  b.fillText("ÉDITION LIMITÉE · BOÎTIER MÉTAL", w / 2, h * 0.8);
  seal(b, w / 2, h * 0.88, w * 0.09, "rgba(235,236,238,.85)");
  const inside = canvas(w * 2, h);
  const i2 = inside[1];
  i2.fillStyle = "#111";
  i2.fillRect(0, 0, w * 2, h);
  if (still) cover(i2, still, 0, 0, w * 2, h, 0.5, 0.5);
  i2.fillStyle = "rgba(0,0,0,.25)";
  i2.fillRect(0, 0, w * 2, h);
  const spine = canvas(E.d * px * 1.2, h);
  const sp = spine[1];
  sp.fillStyle = "#c7cacd";
  sp.fillRect(0, 0, spine[0].width, h);
  sp.save();
  sp.translate(spine[0].width / 2, h * 0.86);
  sp.rotate(-Math.PI / 2);
  sp.fillStyle = "#1b1c1d";
  sp.textBaseline = "middle";
  fit(sp, film.title.toUpperCase(), h * 0.6, spine[0].width * 0.42, (s) => `500 ${s}px ${FONTS.sans}`);
  sp.fillText(film.title.toUpperCase(), 0, 0);
  sp.restore();
  return { face: toTexture(face[0]), back: toTexture(back[0]), inside: toTexture(inside[0]), spine: toTexture(spine[0]) };
}

/* ------------------------------------------------------------------ */
/* Fourreau collector : carton mat, titre en dorure à chaud             */
/* ------------------------------------------------------------------ */
export async function sleeveArt(film: CaseFilm) {
  await fontsReady();
  const E = EDITIONS.collector;
  const px = 760, w = E.w * px, h = E.h * px, d = E.d * px;
  const [poster, still] = await Promise.all([loadImage(imageUrl(film.poster, "w780")), loadImage(imageUrl(film.backdrop, "w1280"))]);
  const deep = mix(hex(film.color, "#3a2020"), "#0c0b0a", 0.55);
  const make = (draw: (ctx: CanvasRenderingContext2D, foil: CanvasRenderingContext2D, W: number, H: number) => void, W: number, H: number) => {
    const [c, ctx] = canvas(W, H);
    const [m, mctx] = canvas(W, H);
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, W, H);
    draw(ctx, mctx, W, H);
    return { map: toTexture(c), foil: toTexture(m, false) };
  };
  const gold = "#c9a45c";
  // Face : l'affiche en gravure (bichromie très sombre), un cadre et le titre en dorure
  const front = make((ctx, foil, W, H) => {
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, W, H);
    const img = poster ?? still;
    if (img) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.filter = "grayscale(1) contrast(1.4) brightness(.8)";
      cover(ctx, img, W * 0.08, H * 0.08, W * 0.84, H * 0.64);
      ctx.restore();
      ctx.globalCompositeOperation = "color";
      ctx.fillStyle = deep;
      ctx.fillRect(W * 0.08, H * 0.08, W * 0.84, H * 0.64);
      ctx.globalCompositeOperation = "source-over";
    }
    for (const g of [ctx, foil]) {
      g.strokeStyle = g === ctx ? gold : "#fff";
      g.fillStyle = g === ctx ? gold : "#fff";
      g.lineWidth = 3;
      g.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
      g.lineWidth = 1.5;
      g.strokeRect(W * 0.065, H * 0.065, W * 0.87, H * 0.87);
      g.textAlign = "center";
      fit(g, film.title, W * 0.78, W * 0.12, (s) => `400 ${s}px ${FONTS.display}`);
      g.fillText(film.title, W / 2, H * 0.82);
      g.font = `italic 400 ${W * 0.042}px ${FONTS.display}`;
      g.fillText(film.director ?? "", W / 2, H * 0.87);
      g.font = `500 ${W * 0.024}px ${FONTS.mono}`;
      g.fillText("ÉDITION COLLECTOR", W / 2, H * 0.915);
    }
  }, w, h);
  const back = make((ctx, foil, W, H) => {
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(243,238,230,.8)";
    ctx.font = `400 ${W * 0.03}px ${FONTS.sans}`;
    wrap(ctx, film.overview ?? "", W * 0.1, H * 0.2, W * 0.8, W * 0.045, 10);
    for (const g of [ctx, foil]) {
      g.fillStyle = g === ctx ? gold : "#fff";
      seal(g, W / 2, H * 0.1, W * 0.12, g === ctx ? gold : "#fff");
      g.font = `500 ${W * 0.022}px ${FONTS.mono}`;
      g.textAlign = "center";
      g.fillText("CONTIENT : LE FILM · UN LIVRET · QUATRE CARTES", W / 2, H * 0.78);
    }
    barcode(ctx, W * 0.39, H * 0.86, W * 0.22, H * 0.04, film.id);
  }, w, h);
  const spine = make((ctx, foil, W, H) => {
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, W, H);
    for (const g of [ctx, foil]) {
      g.save();
      g.fillStyle = g === ctx ? gold : "#fff";
      g.translate(W / 2, H * 0.85);
      g.rotate(-Math.PI / 2);
      g.textBaseline = "middle";
      fit(g, film.title, H * 0.6, W * 0.5, (s) => `400 ${s}px ${FONTS.display}`);
      g.fillText(film.title, 0, 0);
      g.restore();
      seal(g, W / 2, H * 0.94, W * 0.6, g === ctx ? gold : "#fff");
    }
  }, d * 1.2, h);
  const edge = make((ctx, _f, W, H) => {
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, W, H);
  }, 64, 64);
  return { front, back, spine, edge };
}

/* ------------------------------------------------------------------ */
/* Digipak personnalisé : trois interprétations graphiques              */
/* ------------------------------------------------------------------ */
export type DigiVariant = "affiche" | "typo" | "bichromie";
export async function digipakArt(film: CaseFilm, variant: DigiVariant) {
  await fontsReady();
  const E = EDITIONS.digipak;
  const px = 760, w = E.w * px, h = E.h * px;
  const [poster, still] = await Promise.all([loadImage(imageUrl(film.poster, "w780")), loadImage(imageUrl(film.backdrop, "w1280"))]);
  const col = hex(film.color, "#8a3b2b");
  const front = canvas(w, h), f = front[1];
  if (variant === "affiche") {
    f.fillStyle = "#111";
    f.fillRect(0, 0, w, h);
    if (poster) cover(f, poster, 0, 0, w, h);
  } else if (variant === "typo") {
    f.fillStyle = mix(col, "#efe8dc", 0.25);
    f.fillRect(0, 0, w, h);
    f.fillStyle = "#14110e";
    f.textAlign = "left";
    const words = film.title.split(" ");
    let y = h * 0.2;
    for (const wd of words) {
      const s = fit(f, wd, w * 0.84, w * 0.3, (s2) => `400 ${s2}px ${FONTS.display}`);
      f.fillText(wd, w * 0.08, y + s * 0.8);
      y += s * 0.95;
      if (y > h * 0.75) break;
    }
    f.font = `500 ${w * 0.028}px ${FONTS.mono}`;
    f.fillText(`${film.director?.toUpperCase() ?? ""} — ${film.year ?? ""}`, w * 0.08, h * 0.92);
  } else {
    // bichromie : l'image du film en deux encres (la couleur du film et un bleu nuit)
    f.fillStyle = "#151a2b";
    f.fillRect(0, 0, w, h);
    const img = still ?? poster;
    if (img) {
      f.save();
      f.filter = "grayscale(1) contrast(1.6)";
      cover(f, img, 0, 0, w, h, 0.4, 0.5);
      f.restore();
      f.globalCompositeOperation = "multiply";
      f.fillStyle = mix(col, "#ff7a3a", 0.3);
      f.fillRect(0, 0, w, h);
      f.globalCompositeOperation = "screen";
      f.fillStyle = "#151a2b";
      f.fillRect(0, 0, w, h);
      f.globalCompositeOperation = "source-over";
    }
    f.fillStyle = "#f3eee6";
    f.textAlign = "center";
    fit(f, film.title.toUpperCase(), w * 0.84, w * 0.1, (s) => `700 ${s}px ${FONTS.sans}`);
    f.fillText(film.title.toUpperCase(), w / 2, h * 0.9);
  }
  const back = canvas(w, h), b = back[1];
  b.fillStyle = variant === "typo" ? mix(col, "#efe8dc", 0.25) : "#14110e";
  b.fillRect(0, 0, w, h);
  b.fillStyle = variant === "typo" ? "#14110e" : "#efe8dc";
  b.font = `400 ${w * 0.032}px ${FONTS.sans}`;
  wrap(b, film.overview ?? "", w * 0.1, h * 0.15, w * 0.8, w * 0.046, 11);
  barcode(b, w * 0.68, h * 0.87, w * 0.22, h * 0.045, film.id);
  seal(b, w * 0.14, h * 0.9, w * 0.09, variant === "typo" ? "#14110e" : "#efe8dc");
  // intérieur : l'image du film sur les deux volets
  const inside = canvas(w * 2, h), i2 = inside[1];
  i2.fillStyle = "#0e0d0c";
  i2.fillRect(0, 0, w * 2, h);
  if (still) cover(i2, still, 0, 0, w * 2, h);
  const spine = canvas(E.d * px * 1.3, h), sp = spine[1];
  sp.fillStyle = variant === "typo" ? mix(col, "#efe8dc", 0.25) : "#14110e";
  sp.fillRect(0, 0, spine[0].width, h);
  sp.save();
  sp.translate(spine[0].width / 2, h * 0.88);
  sp.rotate(-Math.PI / 2);
  sp.fillStyle = variant === "typo" ? "#14110e" : "#efe8dc";
  sp.textBaseline = "middle";
  fit(sp, film.title, h * 0.7, spine[0].width * 0.62, (s) => `400 ${s}px ${FONTS.display}`);
  sp.fillText(film.title, 0, 0);
  sp.restore();
  return { front: toTexture(front[0]), back: toTexture(back[0]), inside: toTexture(inside[0]), spine: toTexture(spine[0]) };
}

/* ------------------------------------------------------------------ */
/* Étiquette du disque                                                  */
/* ------------------------------------------------------------------ */
export async function discLabel(film: CaseFilm, edition: EditionKey, variant: DigiVariant = "affiche") {
  await fontsReady();
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const still = await loadImage(imageUrl(film.backdrop ?? film.poster, "w780"));
  const R = S / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.clip();
  const prestige = edition === "prestige";
  const steel = edition === "steelbook";
  const gold = edition === "collector";
  if (prestige) {
    ctx.fillStyle = "#efebe3";
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = "#1a1714";
    ctx.textAlign = "center";
    ctx.font = `400 ${S * 0.11}px ${FONTS.display}`;
    ctx.fillText(num(film.id), R, S * 0.3);
    fit(ctx, film.title, S * 0.6, S * 0.06, (s) => `400 ${s}px ${FONTS.display}`);
    ctx.fillText(film.title, R, S * 0.74);
    ctx.font = `500 ${S * 0.022}px ${FONTS.mono}`;
    ctx.fillText("DREAMS COLLECTION", R, S * 0.8);
  } else if (steel || gold) {
    const g = ctx.createRadialGradient(R, R, S * 0.1, R, R, R);
    g.addColorStop(0, steel ? "#d9dcdf" : "#d8bd7e");
    g.addColorStop(1, steel ? "#8d9195" : "#8f6e33");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = steel ? "#1b1c1d" : "#2a1d0c";
    ctx.textAlign = "center";
    fit(ctx, film.title.toUpperCase(), S * 0.62, S * 0.07, (s) => `400 ${s}px ${FONTS.display}`);
    ctx.fillText(film.title.toUpperCase(), R, S * 0.76);
    seal(ctx, R, S * 0.24, S * 0.12, steel ? "#1b1c1d" : "#2a1d0c");
  } else {
    ctx.fillStyle = printColor(film);
    ctx.fillRect(0, 0, S, S);
    if (still && variant !== "typo") cover(ctx, still, 0, 0, S, S);
    const g = ctx.createLinearGradient(0, S * 0.45, 0, S);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.82)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = "#f3eee6";
    ctx.textAlign = "center";
    fit(ctx, film.title, S * 0.6, S * 0.075, (s) => `400 ${s}px ${FONTS.display}`);
    ctx.fillText(film.title, R, S * 0.8);
    ctx.font = `500 ${S * 0.024}px ${FONTS.mono}`;
    ctx.fillText(`${EDITIONS[edition].label.toUpperCase()} · ${film.year ?? ""}`, R, S * 0.86);
  }
  ctx.restore();
  // trou central et anneau transparent
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(R, R, S * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  return toTexture(c);
}

/* ------------------------------------------------------------------ */
/* Tranche seule (étagère) : légère, lisible de loin                   */
/* ------------------------------------------------------------------ */
export async function spineArt(film: CaseFilm, edition: EditionKey) {
  await fontsReady();
  const E = EDITIONS[edition];
  const W = 128, H = Math.round((E.h / E.d) * 128 * 0.9);
  const [c, ctx] = canvas(W, H);
  const prestige = edition === "prestige", steel = edition === "steelbook", digi = edition === "digipak", col = edition === "collector";
  const base = steel ? "#b9bdc2" : prestige ? "#efebe3" : digi ? mix(hex(film.color, "#8a3b2b"), "#efe8dc", 0.25) : col ? mix(hex(film.color, "#3a2020"), "#0c0b0a", 0.55) : printColor(film);
  const ink = steel || prestige || digi ? "#16130f" : col ? "#c9a45c" : "#f3eee6";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  if (steel) {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(255,255,255,.35)");
    g.addColorStop(0.5, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  let top = 0;
  if (E.banner && !prestige) {
    ctx.fillStyle = E.banner;
    ctx.fillRect(0, 0, W, H * 0.085);
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${W * 0.3}px ${FONTS.sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(E.bannerShort!, W / 2, H * 0.045);
    top = H * 0.085;
  }
  if (prestige) {
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 ${W * 0.42}px ${FONTS.display}`;
    ctx.fillText(num(film.id), W / 2, H * 0.06);
    top = H * 0.1;
  }
  ctx.save();
  ctx.translate(W / 2, H * 0.9);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const t = steel || prestige ? film.title.toUpperCase() : film.title;
  fit(ctx, t, H * 0.8 - top - H * 0.05, W * 0.52, (s) => (steel || prestige ? `600 ${s}px ${FONTS.sans}` : `400 ${s}px ${FONTS.display}`));
  ctx.fillText(t, 0, 0);
  ctx.restore();
  seal(ctx, W / 2, H * 0.955, W * 0.5, ink);
  return toTexture(c);
}

/* ------------------------------------------------------------------ */
/* Livret (dans le couvercle) : la page des chapitres                   */
/* ------------------------------------------------------------------ */
export async function booklet(film: CaseFilm) {
  await fontsReady();
  const W = 640, H = 900;
  const [c, ctx] = canvas(W, H);
  const still = await loadImage(imageUrl(film.backdrop ?? film.poster, "w780"));
  ctx.fillStyle = "#f1ece3";
  ctx.fillRect(0, 0, W, H);
  if (still) cover(ctx, still, 40, 40, W - 80, 300);
  ctx.fillStyle = "#1a1714";
  ctx.font = `400 44px ${FONTS.display}`;
  ctx.fillText(film.title.length > 22 ? film.title.slice(0, 21) + "…" : film.title, 40, 400);
  ctx.font = `500 15px ${FONTS.mono}`;
  ctx.fillStyle = "#6a6258";
  ctx.fillText("CHAPITRES", 40, 440);
  const total = (film.runtime ?? 110) * 60;
  ctx.font = `400 19px ${FONTS.sans}`;
  for (let i = 0; i < 12; i++) {
    const t = Math.round((total * i) / 12);
    const hh = Math.floor(t / 3600), mm = String(Math.floor((t % 3600) / 60)).padStart(2, "0"), ss = String(t % 60).padStart(2, "0");
    const col = i < 6 ? 0 : 1;
    const y = 480 + (i % 6) * 58;
    ctx.fillStyle = "#1a1714";
    ctx.fillText(`${String(i + 1).padStart(2, "0")}`, 40 + col * 290, y);
    ctx.fillStyle = "#6a6258";
    ctx.fillText(`${hh}:${mm}:${ss}`, 90 + col * 290, y);
  }
  seal(ctx, W - 70, H - 60, 50, "#1a1714");
  return toTexture(c);
}

// Le film plastique n'est jamais parfaitement plat : de très légères ondulations font vivre les reflets
let sheenTex: THREE.Texture | null = null;
export function sheenBump() {
  if (sheenTex) return sheenTex;
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 20 + Math.random() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = Math.random() > 0.5 ? 255 : 0;
    g.addColorStop(0, `rgba(${v},${v},${v},0.09)`);
    g.addColorStop(1, "rgba(128,128,128,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  sheenTex = new THREE.CanvasTexture(c);
  sheenTex.wrapS = sheenTex.wrapT = THREE.RepeatWrapping;
  return sheenTex;
}
