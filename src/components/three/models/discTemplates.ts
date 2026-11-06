import * as THREE from "three";
import { FONTS, fontsReady, imageUrl, loadImage, type CaseFilm } from "../cases/art";
import { drawDiscDesign } from "./discDesign";

/*
 * Dix modèles d'étiquette de disque, imprimés comme sur un vrai disque :
 *   zone imprimable de 21,5 à 58 mm du centre (sur un disque de 120 mm) ; au centre, le polycarbonate transparent
 *   et l'anneau miroir restent visibles ; le bord extérieur (58 → 60 mm) n'est jamais imprimé.
 * Certains modèles laissent volontairement le miroir apparaître (impression sur argent).
 */
export const DISC_TEMPLATES = [
  { key: "photo", label: "Photo" },
  { key: "affiche", label: "Affiche" },
  { key: "typo", label: "Typographique" },
  { key: "bichromie", label: "Bichromie" },
  { key: "argent", label: "Sérigraphie argent" },
  { key: "bandes", label: "Bandes" },
  { key: "sillons", label: "Sillons" },
  { key: "blanc", label: "Blanc d'imprimerie" },
  { key: "numero", label: "Édition numérotée" },
  { key: "demilune", label: "Demi-lune" },
] as const;
export type DiscTemplate = (typeof DISC_TEMPLATES)[number]["key"];

const S = 2048; // 2048 px pour 120 mm : environ 17 px/mm, impression nette en gros plan
const MM = S / 120;
const R_IN = 21.5 * MM, R_OUT = 58 * MM, C = S / 2;

const hex = (c: string | null | undefined, f: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : f);
function shade(hexc: string, t: number) {
  const n = parseInt(hexc.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * (1 - Math.abs(t)) + (t > 0 ? 255 : 0) * Math.abs(t))));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function lum(hexc: string) {
  const n = parseInt(hexc.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, fx = 0.5, fy = 0.5) {
  const r = Math.max(w / img.width, h / img.height), sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.width - sw) * fx, (img.height - sh) * fy, sw, sh, x, y, w, h);
}
// Texte courbé le long d'un cercle (comme les mentions sur le pourtour d'un disque)
function arcText(ctx: CanvasRenderingContext2D, text: string, r: number, start: number, font: string, color: string, spacing = 0) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let a = start;
  for (const ch of text) {
    const w = ctx.measureText(ch).width + spacing;
    a += w / 2 / r;
    ctx.save();
    ctx.translate(C + Math.cos(a) * r, C + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += w / 2 / r;
  }
  ctx.restore();
}
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, f: (s: number) => string) {
  let s = size;
  ctx.font = f(s);
  while (ctx.measureText(text).width > maxW && s > 12) ctx.font = f((s -= 2));
  return s;
}
const legal = (film: CaseFilm) => `DREAMS MOVIES · ${film.runtime ? film.runtime + " MIN · " : ""}PAL · ZONE 2 · ${film.year ?? ""}`;

export async function discLabelTexture(film: CaseFilm, key: DiscTemplate) {
  await fontsReady();
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  // le disque composé par le membre l'emporte sur les modèles
  if (film.design?.disc) {
    await drawDiscDesign(ctx, film, film.design.disc);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const [still, poster] = await Promise.all([loadImage(imageUrl(film.backdrop, "w1280")), loadImage(imageUrl(film.poster, "w780"))]);
  const col = hex(film.color, "#6b2a2a");
  const ink = lum(col) > 0.55 ? "#141210" : "#f4efe6";
  const title = film.title;
  const dir = (film.director ?? "").toUpperCase();

  // la zone imprimable : un anneau
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, R_OUT, 0, Math.PI * 2);
  ctx.arc(C, C, R_IN, 0, Math.PI * 2, true);
  ctx.clip("evenodd");

  switch (key) {
    case "photo": {
      ctx.fillStyle = shade(col, -0.4);
      ctx.fillRect(0, 0, S, S);
      if (still) cover(ctx, still, C - R_OUT, C - R_OUT, R_OUT * 2, R_OUT * 2, 0.5, 0.45);
      const g = ctx.createLinearGradient(0, C, 0, C + R_OUT);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,.78)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = "#f4efe6";
      ctx.textAlign = "center";
      fitFont(ctx, title, R_OUT * 1.15, 130, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(title, C, C + R_OUT * 0.62);
      arcText(ctx, legal(film), R_OUT - 50, Math.PI * 1.15, `500 30px ${FONTS.mono}`, "rgba(244,239,230,.75)", 4);
      break;
    }
    case "affiche": {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, S, S);
      if (poster) cover(ctx, poster, C - R_OUT, C - R_OUT, R_OUT * 2, R_OUT * 2, 0.5, 0.3);
      arcText(ctx, `${title.toUpperCase()} · ${dir}`, R_OUT - 46, Math.PI * 0.62, `600 34px ${FONTS.sans}`, "#fff", 6);
      break;
    }
    case "typo": {
      ctx.fillStyle = col;
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      const words = title.split(" ");
      const lines = words.length > 3 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [title];
      lines.forEach((l, i) => {
        const s = fitFont(ctx, l, R_OUT * 1.5, 200, (z) => `400 ${z}px ${FONTS.display}`);
        ctx.fillText(l, C, C - R_OUT * 0.5 + i * s * 0.95 - (lines.length - 1) * s * 0.2);
      });
      ctx.font = `500 40px ${FONTS.mono}`;
      ctx.fillText(dir, C, C + R_OUT * 0.68);
      break;
    }
    case "bichromie": {
      ctx.fillStyle = "#14213d";
      ctx.fillRect(0, 0, S, S);
      if (still) {
        ctx.save();
        ctx.filter = "grayscale(1) contrast(1.5)";
        cover(ctx, still, C - R_OUT, C - R_OUT, R_OUT * 2, R_OUT * 2);
        ctx.restore();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = shade(col, 0.25);
        ctx.fillRect(0, 0, S, S);
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "#14213d";
        ctx.fillRect(0, 0, S, S);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.fillStyle = "#f4efe6";
      ctx.textAlign = "center";
      fitFont(ctx, title.toUpperCase(), R_OUT * 1.3, 110, (s) => `700 ${s}px ${FONTS.sans}`);
      ctx.fillText(title.toUpperCase(), C, C + R_OUT * 0.66);
      break;
    }
    case "argent": {
      // impression directe sur le miroir : seule l'encre noire et un aplat partiel, le reste laisse voir l'argent
      ctx.fillStyle = "rgba(20,20,22,.92)";
      ctx.beginPath();
      ctx.arc(C, C, R_OUT, Math.PI * 0.08, Math.PI * 0.92);
      ctx.arc(C, C, R_IN + 60, Math.PI * 0.92, Math.PI * 0.08, true);
      ctx.fill();
      ctx.fillStyle = "#f4efe6";
      ctx.textAlign = "center";
      fitFont(ctx, title, R_OUT * 1.1, 110, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(title, C, C + R_OUT * 0.6);
      arcText(ctx, dir, R_OUT - 70, -Math.PI * 0.82, `600 54px ${FONTS.sans}`, "rgba(18,18,20,.92)", 10);
      arcText(ctx, legal(film), R_IN + 34, -Math.PI * 0.8, `500 22px ${FONTS.mono}`, "rgba(18,18,20,.85)", 3);
      break;
    }
    case "bandes": {
      const palette = [shade(col, -0.55), shade(col, -0.25), col, shade(col, 0.3), "#f4efe6"];
      const band = (R_OUT * 2) / 9;
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(0, C - R_OUT + i * band, S, band + 1);
      }
      ctx.fillStyle = "rgba(15,13,11,.86)";
      ctx.fillRect(0, C + R_OUT * 0.36, S, R_OUT * 0.42);
      ctx.fillStyle = "#f4efe6";
      ctx.textAlign = "center";
      fitFont(ctx, title, R_OUT * 1.2, 120, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(title, C, C + R_OUT * 0.62);
      break;
    }
    case "sillons": {
      // anneaux concentriques serrés, comme un vinyle, avec le titre au centre
      ctx.fillStyle = "#0d0c0b";
      ctx.fillRect(0, 0, S, S);
      for (let r = R_IN + 20; r < R_OUT; r += 7) {
        ctx.strokeStyle = `rgba(255,255,255,${0.025 + 0.03 * Math.abs(Math.sin(r * 0.05))})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(C, C, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(C, C, R_IN + 260, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      fitFont(ctx, title, 420, 70, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(title, C, C - R_IN - 90);
      ctx.font = `500 26px ${FONTS.mono}`;
      ctx.fillText(dir, C, C + R_IN + 110);
      break;
    }
    case "blanc": {
      ctx.fillStyle = "#f3f1ec";
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = "#16130f";
      ctx.textAlign = "center";
      fitFont(ctx, title, R_OUT * 1.0, 96, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(title, C, C - R_OUT * 0.52);
      ctx.font = `500 30px ${FONTS.mono}`;
      ctx.fillText(dir, C, C - R_OUT * 0.4);
      if (poster) cover(ctx, poster, C + R_OUT * 0.3, C + R_OUT * 0.2, R_OUT * 0.36, R_OUT * 0.5);
      arcText(ctx, legal(film), R_OUT - 40, Math.PI * 0.62, `500 26px ${FONTS.mono}`, "#6a6258", 3);
      break;
    }
    case "numero": {
      ctx.fillStyle = "#e9e4d8";
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = "#16130f";
      ctx.textAlign = "center";
      ctx.font = `400 300px ${FONTS.display}`;
      ctx.fillText(String(film.id).padStart(3, "0"), C, C - R_IN - 150);
      ctx.fillRect(C - 200, C + R_IN + 40, 400, 4);
      fitFont(ctx, title, R_OUT * 1.1, 84, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(title, C, C + R_IN + 150);
      ctx.font = `500 28px ${FONTS.mono}`;
      ctx.fillText("DREAMS COLLECTION", C, C + R_IN + 220);
      break;
    }
    case "demilune": {
      ctx.fillStyle = col;
      ctx.fillRect(0, 0, S, S);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, S, C);
      ctx.clip();
      if (still) cover(ctx, still, C - R_OUT, C - R_OUT, R_OUT * 2, R_OUT, 0.5, 0.4);
      ctx.restore();
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      fitFont(ctx, title, R_OUT * 1.25, 120, (s) => `400 ${s}px ${FONTS.display}`);
      ctx.fillText(title, C, C + R_OUT * 0.45);
      ctx.font = `500 32px ${FONTS.mono}`;
      ctx.fillText(dir, C, C + R_OUT * 0.62);
      break;
    }
  }
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
