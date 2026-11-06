import * as THREE from "three";
import { BRAND_PATH } from "@/lib/brand-path";
import { canvas, cover, fontsReady, FONTS, imageUrl, loadImage, toTexture, type CaseFilm } from "../cases/art";
import type { DiscTemplate } from "../models/discTemplates";
import { collectionNumber, deep, filmPalette, hex, INK, jacketStyle, lum, rgb, spineLook, type JacketStyle } from "@/lib/jacket-palette";
export { collectionNumber, filmPalette, jacketStyle, type JacketStyle };

/*
 * L'imprimerie de « La Collection Dreams » : la jaquette dépliée d'un boîtier DVD (dos | tranche | face).
 * Inspirée du soin éditorial des éditions Criterion, sans les copier :
 *   — la TRANCHE suit un système commun à toute la collection (étoile argent, numéro, titre, réalisateur) :
 *     alignées sur une étagère, les tranches forment un ensemble cohérent ;
 *   — la FACE change de composition selon le film (six maquettes, choisies d'après le film et ses images) ;
 *   — le DOS est une vraie quatrième de couverture : synopsis, photogramme, générique, caractéristiques, code-barres.
 * Échelle : 10 px par millimètre. Une jaquette DVD mesure 183 mm de haut, 129,5 mm par face ; la tranche suit le boîtier.
 */

export const JACKET_STYLES: { key: JacketStyle; label: string; disc: DiscTemplate }[] = [
  { key: "cadre", label: "Cadre", disc: "blanc" },
  { key: "plein", label: "Plein cadre", disc: "photo" },
  { key: "typo", label: "Typographique", disc: "typo" },
  { key: "affiche", label: "Affiche", disc: "affiche" },
  { key: "bande", label: "Bande", disc: "bandes" },
  { key: "bichromie", label: "Bichromie", disc: "bichromie" },
];

const PX = 10;
export const JACKET = { face: 129.5 * PX, h: 183 * PX };
export const jacketLayout = (mm: number) => ({ fw: JACKET.face, sw: Math.max(40, (mm - 0.5) * PX), h: JACKET.h });

export const discFor = (s: JacketStyle) => JACKET_STYLES.find((x) => x.key === s)!.disc;

/* --- typographie --- */
const disp = (s: number, italic = false) => `${italic ? "italic " : ""}400 ${s}px ${FONTS.display}`;
const sans = (s: number, w = 500) => `${w} ${s}px ${FONTS.sans}`;
function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "center" | "right" = "left") {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}
function fitSize(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, font: (s: number) => string, min = 14) {
  let s = start;
  ctx.font = font(s);
  while (ctx.measureText(text).width > maxW && s > min) ctx.font = font((s -= 2));
  return s;
}
function lines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
function paragraph(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const ls = lines(ctx, text, maxW);
  const shown = ls.slice(0, maxLines);
  if (ls.length > maxLines) shown[maxLines - 1] = shown[maxLines - 1].replace(/\s*\S*$/, " …");
  shown.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + shown.length * lh;
}
// L'étoile du logo, dessinée à l'échelle voulue (largeur w), en argent ou d'une couleur
function star(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string | "silver") {
  const p = new Path2D(BRAND_PATH);
  ctx.save();
  ctx.translate(x - w / 2, y - (w * 966) / 1658 / 2);
  ctx.scale(w / 1658, w / 1658);
  if (color === "silver") {
    const g = ctx.createLinearGradient(0, 0, 1658, 966);
    [["0", "#8e929c"], ["0.22", "#f4f5f8"], ["0.36", "#b9bcc4"], ["0.48", "#ffffff"], ["0.56", "#7c808a"], ["0.7", "#e6e8ed"], ["0.86", "#9da1aa"], ["1", "#eef0f4"]].forEach(([o, c]) => g.addColorStop(Number(o), c));
    ctx.fillStyle = g;
  } else ctx.fillStyle = color;
  ctx.fill(p);
  ctx.restore();
}
function grain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, amount = 0.05) {
  const n = canvas(256, 256);
  const id = n[1].createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255 * amount;
  }
  n[1].putImageData(id, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(n[0], "repeat")!;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
// Une image en bichromie : le noir et blanc de l'image, imprimé en deux encres (couleur du film + noir)
function duotone(img: HTMLImageElement, w: number, h: number, light: string, dark: string, fx = 0.5, fy = 0.45) {
  const [c, x] = canvas(w, h);
  cover(x, img, 0, 0, w, h, fx, fy);
  const d = x.getImageData(0, 0, w, h);
  const [lr, lg, lb] = rgb(light), [dr, dg, db] = rgb(dark);
  for (let i = 0; i < d.data.length; i += 4) {
    let t = (0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2]) / 255;
    t = Math.min(1, Math.max(0, (t - 0.08) * 1.25));
    d.data[i] = dr + (lr - dr) * t;
    d.data[i + 1] = dg + (lg - dg) * t;
    d.data[i + 2] = db + (lb - db) * t;
  }
  x.putImageData(d, 0, 0);
  return c;
}
function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 14, y - 14, w + 28, h + 52);
  ctx.fillStyle = "#000";
  let s = seed || 1;
  let cx = x;
  while (cx < x + w) {
    s = (s * 16807) % 2147483647;
    const bw = 2 + (s % 4) * 1.6;
    if (s % 3) ctx.fillRect(cx, y, bw, h);
    cx += bw + 2 + ((s >> 3) % 3);
  }
  ctx.font = sans(17, 400);
  ctx.textAlign = "center";
  ctx.fillText(`3 ${String(seed).padStart(6, "0").slice(0, 6)} ${String(seed * 7).slice(-6).padStart(6, "0")}`, x + w / 2, y + h + 26);
}

export type JacketResult = { texture: THREE.CanvasTexture; layout: { fw: number; sw: number; h: number }; style: JacketStyle };

// res : résolution d'impression (1 = 10 px/mm ; 0,5 pour les défilés, où l'on voit beaucoup de boîtiers à la fois)
export async function dreamsJacket(film: CaseFilm, mm: number, style: JacketStyle = jacketStyle(film), res = 1): Promise<JacketResult> {
  await fontsReady();
  const L = jacketLayout(mm);
  const { fw, sw, h } = L;
  const W = fw * 2 + sw;
  const [cv, ctx] = canvas(W * res, h * res);
  ctx.scale(res, res);
  const [still, poster] = await Promise.all([loadImage(imageUrl(film.backdrop, "w1280")), loadImage(imageUrl(film.poster, "w780"))]);
  const col = hex(film.color);
  const num = collectionNumber(film.id);
  const D = film.design?.case ?? {};
  const F = D.front ?? {}, B = D.back ?? {};
  const title = F.title?.trim() || film.title;
  const showT = F.showTitle !== false;
  const subtitle = F.subtitle != null ? F.subtitle.trim() : film.originalTitle && film.originalTitle !== film.title ? film.originalTitle : "";
  const dir = film.director ?? "";
  const custom = F.image ? await loadImage(F.image) : null;
  const backImg = B.image ? await loadImage(B.image) : null;

  // Palette de la maquette : fond, encre, accent
  const pal = filmPalette(film.color, style);

  /* ============ FACE (à droite) ============ */
  const fx = fw + sw;
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, 0, fw, h);
  ctx.clip();
  ctx.fillStyle = pal.bg;
  ctx.fillRect(fx, 0, fw, h);
  const m = 110; // marge
  const head = (ink: string) => {
    if (F.showHead === false) return;
    ctx.fillStyle = ink;
    ctx.font = sans(22, 500);
    tracked(ctx, dir ? `UN FILM DE ${dir.toUpperCase()}` : "LA COLLECTION DREAMS", fx + fw / 2, 150, 7, "center");
  };
  const foot = (ink: string, starColor: string | "silver" = "silver") => {
    if (F.showFoot === false) return;
    star(ctx, fx + fw / 2, h - 132, 92, starColor);
    ctx.fillStyle = ink;
    ctx.font = sans(17, 500);
    tracked(ctx, `LA COLLECTION DREAMS  ·  N° ${num}`, fx + fw / 2, h - 66, 5, "center");
  };
  if (custom) {
    // l'image a été recadrée au format exact de la face : elle est posée telle quelle, jamais déformée
    ctx.drawImage(custom, fx, 0, fw, h);
    if (showT || F.showHead !== false || F.showFoot !== false) {
      const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, showT ? "rgba(0,0,0,.72)" : "rgba(0,0,0,.35)");
      ctx.fillStyle = g;
      ctx.fillRect(fx, 0, fw, h);
    }
    head("rgba(255,255,255,.85)");
    if (showT) {
      ctx.fillStyle = "#f3efe7";
      ctx.textAlign = "center";
      const ts = fitSize(ctx, title, fw - m * 2, 120, (z) => disp(z));
      ctx.font = disp(ts);
      const tl = lines(ctx, title, fw - m * 2).slice(0, 3);
      tl.forEach((l, i) => ctx.fillText(l, fx + fw / 2, h - 330 - (tl.length - 1 - i) * ts));
      if (subtitle) {
        ctx.font = disp(38, true);
        ctx.fillStyle = "rgba(243,239,231,.75)";
        ctx.fillText(subtitle, fx + fw / 2, h - 262);
      }
    }
    foot("rgba(255,255,255,.75)");
  } else switch (style) {
    case "cadre": {
      head(pal.soft);
      const iw = fw - m * 2, ih = Math.round(iw * 0.78);
      const iy = 230;
      if (still) cover(ctx, still, fx + m, iy, iw, ih, 0.5, 0.42);
      else if (poster) cover(ctx, poster, fx + m, iy, iw, ih, 0.5, 0.3);
      ctx.strokeStyle = "rgba(0,0,0,.18)";
      ctx.lineWidth = 2;
      ctx.strokeRect(fx + m, iy, iw, ih);
      ctx.fillStyle = pal.ink;
      ctx.textAlign = "center";
      const ts = fitSize(ctx, title, iw, 128, (s) => disp(s));
      ctx.font = disp(ts);
      const tl = showT ? lines(ctx, title, iw) : [];
      tl.slice(0, 3).forEach((l, i) => ctx.fillText(l, fx + fw / 2, iy + ih + 150 + i * ts * 1.02));
      if (showT && subtitle) {
        ctx.font = disp(40, true);
        ctx.fillStyle = pal.soft;
        ctx.fillText(subtitle, fx + fw / 2, iy + ih + 150 + Math.min(3, tl.length) * ts * 1.02 + 20);
      }
      foot(pal.soft, INK);
      break;
    }
    case "plein": {
      if (still) cover(ctx, still, fx, 0, fw, h, 0.5, 0.5);
      else if (poster) cover(ctx, poster, fx, 0, fw, h, 0.5, 0.4);
      const g = ctx.createLinearGradient(0, h * 0.45, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,.86)");
      ctx.fillStyle = g;
      ctx.fillRect(fx, 0, fw, h);
      const g2 = ctx.createLinearGradient(0, 0, 0, 320);
      g2.addColorStop(0, "rgba(0,0,0,.55)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(fx, 0, fw, 320);
      head("rgba(255,255,255,.85)");
      ctx.fillStyle = "#f3efe7";
      ctx.textAlign = "left";
      const ts = fitSize(ctx, title.split(" ").sort((a, b) => b.length - a.length)[0], fw - m * 2, 150, (s) => disp(s));
      ctx.font = disp(ts);
      const tl = showT ? lines(ctx, title, fw - m * 2).slice(0, 3) : [];
      tl.forEach((l, i) => ctx.fillText(l, fx + m, h - 300 - (tl.length - 1 - i) * ts));
      ctx.font = sans(22, 400);
      ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.fillText([film.year, film.countries?.[0]].filter(Boolean).join("  ·  "), fx + m, h - 230);
      foot("rgba(255,255,255,.7)");
      break;
    }
    case "typo": {
      head(pal.soft);
      ctx.fillStyle = pal.ink;
      ctx.textAlign = "left";
      const words = showT ? title.split(" ") : [];
      let y = 360;
      for (const w of words.slice(0, 5)) {
        const s = fitSize(ctx, w, fw - m * 2, 330, (z) => disp(z), 60);
        ctx.font = disp(Math.min(s, 330));
        ctx.fillText(w, fx + m - 8, y + s * 0.78);
        y += s * 0.92;
      }
      // une image dans un cercle, comme une pastille
      if (still) {
        const r = 170, cx = fx + fw - m - r, cy = h - 420;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        cover(ctx, still, cx - r, cy - r, r * 2, r * 2, 0.5, 0.45);
        ctx.restore();
      }
      ctx.font = disp(40, true);
      ctx.fillStyle = pal.soft;
      ctx.fillText(String(film.year ?? ""), fx + m, h - 260);
      foot(pal.soft);
      break;
    }
    case "affiche": {
      ctx.fillStyle = pal.bg;
      ctx.fillRect(fx, 0, fw, h);
      const b = 46;
      if (poster) cover(ctx, poster, fx + b, b + 90, fw - b * 2, h - b * 2 - 90 - 150, 0.5, 0.35);
      else if (still) cover(ctx, still, fx + b, b + 90, fw - b * 2, h - b * 2 - 240, 0.5, 0.45);
      ctx.fillStyle = INK;
      ctx.font = sans(20, 500);
      tracked(ctx, "LA COLLECTION DREAMS", fx + b, b + 58, 6);
      ctx.textAlign = "right";
      ctx.font = disp(40);
      ctx.fillText(`N° ${num}`, fx + fw - b, b + 64);
      ctx.textAlign = "left";
      ctx.font = disp(Math.min(64, fitSize(ctx, title, fw - b * 2 - 120, 64, (s) => disp(s))));
      if (showT) ctx.fillText(title, fx + b, h - b - 64);
      ctx.font = sans(20, 400);
      ctx.fillStyle = "#5f594f";
      ctx.fillText([dir, film.year].filter(Boolean).join("  ·  "), fx + b, h - b - 22);
      star(ctx, fx + fw - b - 52, h - b - 52, 96, INK);
      break;
    }
    case "bande": {
      head(pal.soft);
      ctx.fillStyle = pal.ink;
      ctx.textAlign = "center";
      const ts = fitSize(ctx, title, fw - m * 2, 116, (s) => disp(s, true));
      ctx.font = disp(ts, true);
      (showT ? lines(ctx, title, fw - m * 2) : [])
        .slice(0, 2)
        .forEach((l, i) => ctx.fillText(l, fx + fw / 2, 420 + i * ts));
      const bh = Math.round(fw * 0.62);
      if (still) cover(ctx, still, fx, h / 2 - bh / 2 + 120, fw, bh, 0.5, 0.45);
      ctx.fillStyle = pal.soft;
      ctx.font = sans(22, 500);
      tracked(ctx, [film.year, film.countries?.[0]?.toUpperCase()].filter(Boolean).join("   ·   "), fx + fw / 2, h / 2 + bh / 2 + 210, 6, "center");
      foot(pal.soft);
      break;
    }
    case "bichromie": {
      if (still) ctx.drawImage(duotone(still, fw, h, "#f1e9da", deep(col, 0.08), 0.5, 0.45), fx, 0);
      else if (poster) ctx.drawImage(duotone(poster, fw, h, "#f1e9da", deep(col, 0.08), 0.5, 0.35), fx, 0);
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(fx, 0, fw, h);
      ctx.fillStyle = "#f6f1e7";
      ctx.textAlign = "center";
      const T = title.toUpperCase();
      // la taille tient compte de l'espacement des lettres (16 % du corps)
      const longest = T.split(" ").reduce((a, b) => (b.length > a.length ? b : a), "");
      let ts = 92;
      ctx.font = sans(ts, 600);
      while (ts > 30 && ctx.measureText(longest).width + longest.length * ts * 0.16 > fw - m * 2) ctx.font = sans((ts -= 2), 600);
      const wrapW = (fw - m * 2) * 0.86;
      (showT ? lines(ctx, T, wrapW) : [])
        .slice(0, 3)
        .forEach((l, i, a) => tracked(ctx, l, fx + fw / 2, h / 2 - ((a.length - 1) * ts * 1.15) / 2 + i * ts * 1.15, ts * 0.16, "center"));
      head("rgba(255,255,255,.8)");
      foot("rgba(255,255,255,.75)");
      break;
    }
  }
  grain(ctx, fx, 0, fw, h, 0.04);
  ctx.restore();

  /* ============ TRANCHE (au centre) — le système commun de la collection ============ */
  drawSpine(ctx, fw, 0, sw, h, spineOptions(film, style));

  /* ============ DOS (à gauche) ============ */
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, fw, h);
  ctx.clip();
  const backBg = B.bg ?? pal.back;
  const light = B.bg ? lum(B.bg) > 0.5 : style === "cadre" || style === "affiche";
  const bInk = light ? INK : "#e9e5dd";
  const bSoft = light ? "#6d665c" : "rgba(233,229,221,.6)";
  ctx.fillStyle = backBg;
  ctx.fillRect(0, 0, fw, h);
  const bm = 100;
  ctx.fillStyle = bInk;
  ctx.textAlign = "left";
  ctx.font = disp(fitSize(ctx, title, fw - bm * 2, 82, (s) => disp(s)));
  ctx.fillText(title, bm, 190);
  if (subtitle) {
    ctx.font = disp(34, true);
    ctx.fillStyle = bSoft;
    ctx.fillText(subtitle, bm, 250);
  }
  // photogramme
  const ph = Math.round((fw - bm * 2) * 0.5);
  if (backImg) ctx.drawImage(backImg, bm, 300, fw - bm * 2, ph);
  else if (still) cover(ctx, still, bm, 300, fw - bm * 2, ph, 0.5, 0.35);
  // synopsis
  ctx.fillStyle = bInk;
  ctx.font = sans(27, 400);
  let yy = paragraph(ctx, B.text?.trim() || film.overview || "Un film de la collection Dreams.", bm, 300 + ph + 70, fw - bm * 2, 40, B.showCredits === false ? 16 : 9);
  // générique
  yy += 40;
  ctx.fillStyle = light ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.18)";
  ctx.fillRect(bm, yy, fw - bm * 2, 2);
  yy += 52;
  const credit = (label: string, value: string) => {
    if (!value) return;
    ctx.fillStyle = bSoft;
    ctx.font = sans(17, 500);
    tracked(ctx, label, bm, yy, 4);
    ctx.fillStyle = bInk;
    ctx.font = sans(22, 400);
    const v = lines(ctx, value, fw - bm * 2 - 260)[0];
    ctx.fillText(v, bm + 260, yy);
    yy += 40;
  };
  if (B.showCredits !== false) {
  credit("RÉALISATION", dir);
  credit("AVEC", (film.cast ?? []).slice(0, 4).join(", "));
  credit("PAYS", (film.countries ?? []).slice(0, 2).join(", "));
  credit("GENRE", (film.genres ?? []).slice(0, 3).join(", "));
  // caractéristiques techniques
  ctx.fillStyle = bSoft;
  ctx.font = sans(17, 500);
  tracked(ctx, [film.year, film.runtime ? `${film.runtime} MIN` : null, "COULEUR", "PAL", "ZONE 2", "DOLBY DIGITAL 5.1"].filter(Boolean).join("  ·  "), bm, h - 230, 3);
  barcode(ctx, fw - bm - 230, h - 200, 230, 90, film.id * 9973);
  }
  star(ctx, bm + 60, h - 150, 120, light ? INK : "silver");
  ctx.fillStyle = bSoft;
  ctx.font = sans(16, 500);
  tracked(ctx, `DREAMS MOVIES  ·  N° ${num}`, bm, h - 70, 4);
  grain(ctx, 0, 0, fw, h, 0.035);
  ctx.restore();

  const texture = toTexture(cv);
  return { texture, layout: L, style };
}

// La tranche : fond, étoile argent en tête, numéro, titre vertical, réalisateur ; la même grille pour tous les films
type SpineOptions = { title: string; dir: string; num: string; bg: string; ink: string; year?: number | null; showNumber?: boolean };
const spineOptions = (film: CaseFilm, style: JacketStyle): SpineOptions => ({ ...spineLook({ ...film, design: film.design?.case?.style ? film.design : { ...film.design, case: { ...film.design?.case, style } } }), year: film.year });
export function drawSpine(ctx: CanvasRenderingContext2D, x: number, y: number, sw: number, h: number, o: SpineOptions) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, sw, h);
  ctx.clip();
  ctx.fillStyle = o.bg;
  ctx.fillRect(x, y, sw, h);
  const cx = x + sw / 2;
  const s = Math.min(1, sw / 135); // les tranches fines réduisent tout en proportion
  star(ctx, cx, y + 70 * s + 24, Math.min(sw * 0.72, 100), "silver");
  ctx.fillStyle = o.ink;
  ctx.textAlign = "center";
  ctx.font = disp(Math.max(18, 40 * s));
  if (o.showNumber !== false) ctx.fillText(o.num, cx, y + 170 * s + 40);
  // titre et réalisateur, couchés (de haut en bas, comme sur une tranche française)
  ctx.translate(cx, y + h / 2 + 40);
  ctx.rotate(Math.PI / 2);
  const avail = h - 520;
  const tSize = Math.max(22, Math.min(sw * 0.5, 64));
  ctx.font = sans(tSize, 500);
  const T = o.title.toUpperCase();
  let size = tSize;
  while (ctx.measureText(T).width + T.length * size * 0.14 > avail * 0.72 && size > 16) ctx.font = sans((size -= 2), 500);
  ctx.textBaseline = "middle";
  const tw = tracked(ctx, T, -avail / 2 + 20, sw > 110 ? -sw * 0.12 : 0, size * 0.14, "left");
  if (o.dir) {
    ctx.globalAlpha = 0.62;
    ctx.font = sans(Math.max(14, size * 0.55), 400);
    if (sw > 110) tracked(ctx, o.dir.toUpperCase(), -avail / 2 + 20, sw * 0.2, size * 0.1, "left");
    else tracked(ctx, o.dir.toUpperCase(), -avail / 2 + 20 + tw + 40, 0, size * 0.1, "left");
  }
  ctx.restore();
  // le pied : « DREAMS » discret
  ctx.save();
  ctx.fillStyle = o.ink;
  ctx.globalAlpha = 0.55;
  ctx.font = sans(Math.max(11, 15 * s), 600);
  ctx.textAlign = "center";
  tracked(ctx, "DREAMS", cx, y + h - 60, 3 * s + 1, "center");
  ctx.restore();
}

// Une tranche seule (pour les étagères : une texture légère, sans la jaquette entière)
const spineCache = new Map<string, Promise<THREE.CanvasTexture>>();
export function spineTexture(film: CaseFilm, mm: number, style: JacketStyle = jacketStyle(film)) {
  const key = `${film.id}-${mm}-${style}-${JSON.stringify(film.design?.case?.spine ?? "")}-${film.design?.case?.front?.title ?? ""}`;
  if (!spineCache.has(key))
    spineCache.set(
      key,
      fontsReady().then(() => {
        const sw = Math.max(40, (mm - 0.5) * PX);
        const [c, ctx] = canvas(sw, JACKET.h);
        drawSpine(ctx, 0, 0, sw, JACKET.h, spineOptions(film, style));
        return toTexture(c);
      }),
    );
  return spineCache.get(key)!;
}
