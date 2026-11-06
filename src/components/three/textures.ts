import * as THREE from "three";

/*
 * Les textures « imprimées » des boîtiers, dessinées dans des canevas avec la typographie de l'appli :
 * la tranche (titre en capitales condensées), l'étiquette du disque (image du film, trou central transparent),
 * le dos du boîtier (couleur de l'édition, titre, année).
 */

export type CaseFilm = {
  id: number;
  title: string;
  year: number | null;
  director?: string | null;
  poster: string | null; // chemin TMDB (/abc.jpg) ou image envoyée (/media/…)
  backdrop: string | null;
  href: string;
};

// Les images TMDB passent par le relais de Dreams (WebGL a besoin de pouvoir lire leurs pixels).
export function imageUrl(path: string | null, size: "w342" | "w500" | "w780" = "w500") {
  if (!path) return null;
  if (path.startsWith("/media/") || path.startsWith("http")) return path;
  return `/api/img?s=${size}&p=${encodeURIComponent(path)}`;
}

// Couleurs et police de l'édition en cours (lues dans le CSS, pour que la 3D suive le thème).
export function themeTokens() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    background: v("--background", "#ffd400"),
    foreground: v("--foreground", "#0b0b0b"),
    accent: v("--accent", "#ff3b1f"),
    accent2: v("--accent-2", "#1e3fff"),
    band: v("--band", "#0b0b0b"),
    onBand: v("--on-band", "#ffd400"),
    ink: v("--ink", "#0b0b0b"),
    font: v("--font-archivo", "Arial Narrow").split(",")[0],
    mono: v("--font-geist-mono", "monospace").split(",")[0],
  };
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fontStretch = "extra-condensed"; // Archivo à 62 % de largeur, comme les titres de l'appli
  return [c, ctx] as const;
}

// Les canevas n'attendent pas les polices : on s'assure qu'Archivo est chargée avant de dessiner.
export async function fontsReady() {
  const t = themeTokens();
  await Promise.all([document.fonts.load(`900 64px ${t.font}`), document.fonts.load(`600 20px ${t.mono}`)]).catch(() => {});
}

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Recadre une image pour qu'elle couvre un rectangle (comme object-fit: cover).
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// Écrit un texte en le réduisant jusqu'à ce qu'il tienne dans la largeur donnée.
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: string, family: string) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxW && s > 10);
  return s + 2;
}

// La jaquette : l'affiche du film (ou, sans affiche, un aplat avec le titre).
export async function frontTexture(film: CaseFilm) {
  await fontsReady();
  const t = themeTokens();
  const [c, ctx] = canvas(540, 760);
  const img = film.poster ? await loadImage(imageUrl(film.poster, "w500")!) : null;
  if (img) {
    cover(ctx, img, 0, 0, 540, 760);
  } else {
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, 540, 760);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    const s = fitText(ctx, film.title.toUpperCase(), 460, 120, "900", t.font);
    ctx.fillText(film.title.toUpperCase(), 270, 380 + s / 3);
  }
  // Bandeau du format en haut, comme un vrai boîtier
  ctx.fillStyle = t.ink;
  ctx.fillRect(0, 0, 540, 44);
  ctx.fillStyle = "#fff";
  ctx.font = `800 26px ${t.font}`;
  ctx.textAlign = "center";
  ctx.fillText("DVD · DREAMS", 270, 32);
  return finish(c);
}

// La tranche : le titre à la verticale, en capitales condensées, sur la couleur d'impression.
export async function spineTexture(film: CaseFilm) {
  await fontsReady();
  const t = themeTokens();
  const [c, ctx] = canvas(96, 1024);
  ctx.fillStyle = t.band;
  ctx.fillRect(0, 0, 96, 1024);
  ctx.fillStyle = t.accent;
  ctx.fillRect(0, 0, 96, 120);
  ctx.save();
  ctx.translate(48, 1024 - 40);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = t.onBand;
  const title = film.title.toUpperCase();
  fitText(ctx, title, 780, 74, "900", t.font);
  ctx.textBaseline = "middle";
  ctx.fillText(title, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(48, 60);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#fff";
  ctx.font = `700 30px ${t.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(film.year ?? ""), 0, 0);
  ctx.restore();
  return finish(c);
}

// Le dos : la couleur de l'édition, le titre, l'année et le numéro de catalogue.
export async function backTexture(film: CaseFilm) {
  await fontsReady();
  const t = themeTokens();
  const [c, ctx] = canvas(540, 760);
  ctx.fillStyle = t.background;
  ctx.fillRect(0, 0, 540, 760);
  ctx.fillStyle = t.ink;
  ctx.fillRect(0, 0, 540, 44);
  ctx.fillRect(30, 120, 480, 6);
  ctx.fillStyle = t.foreground;
  ctx.textAlign = "left";
  const title = film.title.toUpperCase();
  const s = fitText(ctx, title, 480, 110, "900", t.font);
  ctx.fillText(title, 30, 120 + s + 10);
  ctx.font = `600 26px ${t.mono}`;
  ctx.fillText(`N°${String(film.id).padStart(4, "0")}  ·  ${film.year ?? ""}`, 30, 680);
  if (film.director) ctx.fillText(film.director.toUpperCase(), 30, 640);
  ctx.fillStyle = t.accent;
  ctx.beginPath();
  ctx.arc(440, 630, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `900 34px ${t.font}`;
  ctx.textAlign = "center";
  ctx.fillText("VU", 440, 642);
  return finish(c);
}

// L'étiquette du disque : l'image du film en plein, le titre, le trou central (transparent) et l'anneau intérieur.
export async function discTexture(film: CaseFilm) {
  await fontsReady();
  const t = themeTokens();
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = t.accent;
  ctx.fillRect(0, 0, S, S);
  const img = await loadImage(imageUrl(film.backdrop ?? film.poster, "w780") ?? "");
  if (img) cover(ctx, img, 0, 0, S, S);
  const g = ctx.createLinearGradient(0, S * 0.45, 0, S);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  const title = film.title.toUpperCase();
  fitText(ctx, title, S * 0.62, 64, "900", t.font);
  ctx.fillText(title, S / 2, S * 0.8);
  ctx.font = `600 16px ${t.mono}`;
  ctx.fillText([film.director, film.year].filter(Boolean).join("  ·  ").toUpperCase(), S / 2, S * 0.86);
  ctx.restore();
  // Zone transparente autour du trou, puis le trou lui-même
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  return finish(c);
}
