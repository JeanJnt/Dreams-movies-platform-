import type { DiscDesign, DiscFont, DiscText } from "@/lib/design-types";
import { collectionNumber } from "@/lib/jacket-palette";
import { imageUrl, loadImage, type CaseFilm } from "../cases/art";

/*
 * L'impression d'un disque composé par le membre (voir DiscDesign) :
 *   fond (argent : le miroir reste visible ; couleur ; image), image cadrée par le membre ou image du film,
 *   motif graphique, puis les textes — droits ou courbés le long du disque, chacun avec sa police, sa taille,
 *   son espacement, son rayon, sa position et son sens de lecture.
 * Échelle : la texture fait S px pour 120 mm ; la zone imprimable va de 21,5 à 58 mm du centre.
 */
export const DISC_S = 2048;
const MM = DISC_S / 120;
const C = DISC_S / 2;

function family(v: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(v).trim() ||
    fallback
  );
}
export function discFontFamily(f: DiscFont) {
  switch (f) {
    case "bungee":
      return family("--font-bungee", "Impact, sans-serif");
    case "sans":
      return family("--font-jost", "Helvetica, Arial, sans-serif");
    case "mono":
      return family("--font-geist-mono", "ui-monospace, monospace");
    default:
      return family("--font-bodoni", "Didot, Georgia, serif");
  }
}
export async function discFontsReady() {
  await Promise.all(
    (["display", "bungee", "sans", "mono"] as DiscFont[]).map((f) =>
      document.fonts.load(`400 60px ${discFontFamily(f)}`).catch(() => null),
    ),
  );
}

export function discTextValue(t: DiscText, film: CaseFilm) {
  const v = (() => {
    switch (t.content) {
      case "title":
        return film.design?.case?.front?.title?.trim() || film.title;
      case "original":
        return film.originalTitle && film.originalTitle !== film.title
          ? film.originalTitle
          : film.title;
      case "director":
        return film.director ?? "";
      case "year":
        return film.year ? String(film.year) : "";
      case "legal":
        return `DREAMS MOVIES · ${film.runtime ? `${film.runtime} MIN · ` : ""}PAL · ZONE 2${film.year ? ` · ${film.year}` : ""}`;
      case "number":
        return `N° ${collectionNumber(film.id)}`;
      default:
        return t.custom ?? "";
    }
  })();
  return t.upper ? v.toUpperCase() : v;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

// Texte courbé : centré sur l'angle donné ; « out » se lit dans le sens horaire (en haut), « in » à l'envers (en bas)
function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  r: number,
  centerDeg: number,
  dir: "out" | "in",
  spacing: number,
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  const center = rad(centerDeg) - Math.PI / 2; // 0° = en haut
  let acc = 0;
  chars.forEach((ch, i) => {
    const mid = acc + (widths[i] - spacing) / 2;
    const a =
      dir === "out"
        ? center - total / 2 / r + mid / r
        : center + total / 2 / r - mid / r;
    ctx.save();
    ctx.translate(C + Math.cos(a) * r, C + Math.sin(a) * r);
    ctx.rotate(dir === "out" ? a + Math.PI / 2 : a - Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    acc += widths[i];
  });
}
function straightText(
  ctx: CanvasRenderingContext2D,
  text: string,
  r: number,
  deg: number,
  spacing: number,
) {
  const x = C + Math.sin(rad(deg)) * r,
    y = C - Math.cos(rad(deg)) * r;
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  chars.forEach((c, i) => {
    ctx.fillText(c, cx + widths[i] / 2, y);
    cx += widths[i] + spacing;
  });
}

function cover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = Math.max(w / img.width, h / img.height),
    sw = w / r,
    sh = h / r;
  ctx.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}
const shade = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(
          ((n >> s) & 255) * (1 - Math.abs(t)) +
            (t > 0 ? 255 : 0) * Math.abs(t),
        ),
      ),
    );
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

// Dessine le disque dans un contexte de DISC_S × DISC_S (texture 3D ou aperçu)
export async function drawDiscDesign(
  ctx: CanvasRenderingContext2D,
  film: CaseFilm,
  d: DiscDesign,
) {
  await discFontsReady();
  const src =
    d.image ??
    (d.useFilmImage === "poster"
      ? imageUrl(film.poster, "w780")
      : d.useFilmImage === "backdrop"
        ? imageUrl(film.backdrop, "w1280")
        : null);
  const img =
    d.bg === "image" || d.image || d.useFilmImage ? await loadImage(src) : null;
  const rIn = Math.max(21.5, d.inner) * MM,
    rOut = Math.min(58, d.outer) * MM;

  ctx.clearRect(0, 0, DISC_S, DISC_S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(C, C, rOut, 0, Math.PI * 2);
  ctx.arc(C, C, rIn, 0, Math.PI * 2, true);
  ctx.clip("evenodd");

  // fond
  if (d.bg !== "silver") {
    ctx.fillStyle = d.bgColor;
    ctx.fillRect(0, 0, DISC_S, DISC_S);
  }
  // image (le carré cadré par le membre couvre tout le disque imprimable, de bord à bord)
  if (img) {
    const R = 58 * MM;
    ctx.save();
    if (d.imageFit === "half") {
      ctx.beginPath();
      ctx.rect(0, 0, DISC_S, C);
      ctx.clip();
    }
    ctx.globalAlpha = d.imageOpacity;
    if (d.imageFilter !== "none") ctx.filter = "grayscale(1) contrast(1.25)";
    cover(ctx, img, C - R, C - R, R * 2, R * 2);
    ctx.filter = "none";
    if (d.imageFilter === "duo") {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = shade(d.bgColor, 0.35);
      ctx.fillRect(0, 0, DISC_S, DISC_S);
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = shade(d.bgColor, -0.55);
      ctx.fillRect(0, 0, DISC_S, DISC_S);
    }
    ctx.restore();
  }
  // motif
  ctx.save();
  ctx.strokeStyle = d.ink;
  ctx.fillStyle = d.ink;
  switch (d.graphic) {
    case "rings":
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 3;
      for (let r = rIn + 3 * MM; r < rOut; r += 4 * MM) {
        ctx.beginPath();
        ctx.arc(C, C, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case "grooves":
      for (let r = rIn + 6; r < rOut; r += 7) {
        ctx.globalAlpha = 0.04 + 0.05 * Math.abs(Math.sin(r * 0.05));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(C, C, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case "bands": {
      const n = 9,
        band = (rOut * 2) / n;
      const pal = [
        shade(d.bgColor, -0.5),
        shade(d.bgColor, -0.2),
        d.bgColor,
        shade(d.bgColor, 0.3),
        d.ink,
      ];
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = pal[i % pal.length];
        ctx.fillRect(0, C - rOut + i * band, DISC_S, band + 1);
      }
      break;
    }
    case "edge":
      ctx.lineWidth = 6;
      [rIn + 1.2 * MM, rOut - 1.2 * MM].forEach((r) => {
        ctx.beginPath();
        ctx.arc(C, C, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      break;
  }
  ctx.restore();

  // textes
  for (const t of d.texts) {
    const text = discTextValue(t, film);
    if (!text.trim()) continue;
    const px = t.size * MM;
    ctx.save();
    ctx.font = `400 ${px}px ${discFontFamily(t.font)}`;
    ctx.fillStyle = t.color ?? d.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const r = t.radius * MM;
    if (t.mode === "arc" && r > 0)
      arcText(ctx, text, r, t.angle, t.direction, t.spacing * px);
    else straightText(ctx, text, r, t.angle, t.spacing * px);
    ctx.restore();
  }
  ctx.restore();
}

/* --- Modèles de départ : chacun est un design complet, entièrement modifiable --- */
const T = (
  o: Partial<DiscText> & Pick<DiscText, "content">,
  i: number,
): DiscText => ({
  id: `t${i}`,
  mode: "straight",
  radius: 36,
  angle: 180,
  size: 5,
  spacing: 0.04,
  direction: "out",
  font: "display",
  ...o,
});
const hex = (c: string | null | undefined, f: string) =>
  c && /^#[0-9a-f]{6}$/i.test(c) ? c : f;
const lumOf = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return (
    (0.2126 * ((n >> 16) & 255) +
      0.7152 * ((n >> 8) & 255) +
      0.0722 * (n & 255)) /
    255
  );
};

export function discPresets(
  film: CaseFilm,
): { key: string; label: string; design: DiscDesign }[] {
  const col = hex(film.color, "#6b2a2a");
  const onCol = lumOf(col) > 0.55 ? "#141210" : "#f4efe6";
  const base = {
    inner: 21.5,
    outer: 58,
    imageFit: "full" as const,
    imageFilter: "none" as const,
    imageOpacity: 1,
    graphic: "none" as const,
    useFilmImage: null,
  };
  return [
    {
      key: "photo",
      label: "Photo",
      design: {
        ...base,
        bg: "image",
        bgColor: "#111111",
        ink: "#f4efe6",
        useFilmImage: film.backdrop ? "backdrop" : "poster",
        texts: [
          T({ content: "title", radius: 38, angle: 180, size: 6.5 }, 0),
          T(
            {
              content: "legal",
              mode: "arc",
              radius: 54.5,
              angle: 180,
              direction: "in",
              size: 1.9,
              font: "mono",
              spacing: 0.12,
            },
            1,
          ),
        ],
      },
    },
    {
      key: "arc",
      label: "Titre en cercle",
      design: {
        ...base,
        bg: "color",
        bgColor: col,
        ink: onCol,
        graphic: "edge",
        texts: [
          T(
            {
              content: "title",
              mode: "arc",
              radius: 48,
              angle: 0,
              size: 6,
              upper: true,
              font: "sans",
              spacing: 0.18,
            },
            0,
          ),
          T(
            {
              content: "director",
              mode: "arc",
              radius: 48,
              angle: 180,
              direction: "in",
              size: 3,
              upper: true,
              font: "sans",
              spacing: 0.3,
            },
            1,
          ),
        ],
      },
    },
    {
      key: "argent",
      label: "Sérigraphie argent",
      design: {
        ...base,
        bg: "silver",
        bgColor: "#141414",
        ink: "#141416",
        graphic: "rings",
        texts: [
          T({ content: "title", radius: 37, angle: 180, size: 6.5 }, 0),
          T(
            {
              content: "director",
              mode: "arc",
              radius: 52,
              angle: 0,
              size: 3.2,
              upper: true,
              font: "sans",
              spacing: 0.25,
            },
            1,
          ),
        ],
      },
    },
    {
      key: "typo",
      label: "Typographique",
      design: {
        ...base,
        bg: "color",
        bgColor: col,
        ink: onCol,
        texts: [
          T(
            {
              content: "title",
              radius: 34,
              angle: 0,
              size: 10,
              font: "bungee",
              upper: true,
            },
            0,
          ),
          T(
            {
              content: "director",
              radius: 40,
              angle: 180,
              size: 2.6,
              font: "mono",
              upper: true,
              spacing: 0.2,
            },
            1,
          ),
        ],
      },
    },
    {
      key: "sillons",
      label: "Sillons",
      design: {
        ...base,
        bg: "color",
        bgColor: "#0d0c0b",
        ink: "#ece8e0",
        graphic: "grooves",
        texts: [
          T(
            {
              content: "title",
              mode: "arc",
              radius: 30,
              angle: 0,
              size: 3.6,
              font: "display",
            },
            0,
          ),
          T(
            {
              content: "year",
              mode: "arc",
              radius: 30,
              angle: 180,
              direction: "in",
              size: 2.6,
              font: "mono",
            },
            1,
          ),
        ],
      },
    },
    {
      key: "blanc",
      label: "Blanc d'imprimerie",
      design: {
        ...base,
        bg: "color",
        bgColor: "#f3f1ec",
        ink: "#16130f",
        texts: [
          T({ content: "title", radius: 34, angle: 0, size: 6 }, 0),
          T(
            {
              content: "director",
              radius: 27,
              angle: 0,
              size: 2,
              font: "mono",
              upper: true,
              spacing: 0.2,
            },
            1,
          ),
          T(
            {
              content: "legal",
              mode: "arc",
              radius: 54.5,
              angle: 180,
              direction: "in",
              size: 1.7,
              font: "mono",
              spacing: 0.12,
            },
            2,
          ),
        ],
      },
    },
    {
      key: "demilune",
      label: "Demi-lune",
      design: {
        ...base,
        bg: "color",
        bgColor: col,
        ink: onCol,
        useFilmImage: film.backdrop ? "backdrop" : "poster",
        imageFit: "half",
        texts: [
          T({ content: "title", radius: 32, angle: 180, size: 6.5 }, 0),
          T(
            {
              content: "director",
              radius: 44,
              angle: 180,
              size: 2.4,
              font: "mono",
              upper: true,
              spacing: 0.2,
            },
            1,
          ),
        ],
      },
    },
    {
      key: "bandes",
      label: "Bandes",
      design: {
        ...base,
        bg: "color",
        bgColor: col,
        ink: "#f4efe6",
        graphic: "bands",
        texts: [T({ content: "title", radius: 37, angle: 180, size: 6.5 }, 0)],
      },
    },
    {
      key: "numero",
      label: "Édition numérotée",
      design: {
        ...base,
        bg: "color",
        bgColor: "#e9e4d8",
        ink: "#16130f",
        graphic: "edge",
        texts: [
          T(
            {
              content: "number",
              radius: 38,
              angle: 0,
              size: 9,
              font: "bungee",
            },
            0,
          ),
          T({ content: "title", radius: 34, angle: 180, size: 4.6 }, 1),
          T(
            {
              content: "custom",
              custom: "DREAMS COLLECTION",
              radius: 44,
              angle: 180,
              size: 1.8,
              font: "mono",
              spacing: 0.3,
            },
            2,
          ),
        ],
      },
    },
    {
      key: "nu",
      label: "Sans texte",
      design: {
        ...base,
        bg: "image",
        bgColor: "#111111",
        ink: "#f4efe6",
        useFilmImage: film.backdrop ? "backdrop" : "poster",
        imageFilter: "duo",
        texts: [],
      },
    },
  ];
}
