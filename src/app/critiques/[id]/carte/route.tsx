/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { ImageResponse } from "next/og";
import { cookies } from "next/headers";
import sharp from "sharp";
import { plainParagraphs } from "@/lib/critique-card";
import { getCritique } from "@/lib/critiques";
import { BRAND_PATH, BRAND_VIEWBOX } from "@/lib/brand-path";
import { mediaBytes } from "@/lib/media";
import { backdrop, poster } from "@/lib/tmdb";

// Carte de partage d'une critique, aux couleurs du thème : une seule image de 1080 px de large, avec tout le texte.
// Sa hauteur suit le texte, avec au moins le format portrait 1080 × 1350 pour une critique courte.
// Plus l'image est haute, plus elle est longue à générer : une critique très longue peut prendre plusieurs dizaines de secondes.
export const maxDuration = 60;

const PALETTES: Record<string, { bg: string; fg: string; accent: string; muted: string; font: string; italic: boolean }> = {
  yume: { bg: "#101c55", fg: "#fbf3d9", accent: "#f2c230", muted: "#a9b5e0", font: "Fraunces", italic: true },
  totoro: { bg: "#e6f1ec", fg: "#1f3a2c", accent: "#3f7d4e", muted: "#5e7b6b", font: "Kaisei Decol", italic: false },
  lynch: { bg: "#0d0303", fg: "#f1ece1", accent: "#d0191f", muted: "#b08d86", font: "Limelight", italic: false },
  pierrot: { bg: "#ff4a1c", fg: "#111111", accent: "#1838ff", muted: "#4a1405", font: "Bagel Fat One", italic: false },
  mood: { bg: "#22080b", fg: "#f3e3cf", accent: "#e0a84e", muted: "#c09a86", font: "Bodoni Moda", italic: true },
  odyssey: { bg: "#f3f3f1", fg: "#0b0b0b", accent: "#e10600", muted: "#6d6d6a", font: "Syncopate", italic: false },
  closeup: { bg: "#eee6d8", fg: "#2a241d", accent: "#a4532a", muted: "#7a6e5f", font: "Lalezar", italic: false },
};

// Récupère la police du thème sur Google Fonts (seulement les lettres utilisées).
async function loadFont(family: string, text: string, italic: boolean) {
  const weight = family === "Fraunces" ? "900" : family === "Bodoni Moda" || family === "Kaisei Decol" ? "700" : "400";
  const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  // Chaque lettre une seule fois : le texte entier d'une critique ne tiendrait pas dans l'adresse.
  const letters = encodeURIComponent([...new Set(text)].join(""));
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${axis}&text=${letters}`)).text();
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  if (!url) throw new Error(`Police introuvable : ${family}`);
  return (await fetch(url)).arrayBuffer();
}

// Étoiles dessinées en SVG (le caractère ★ n'existe pas dans toutes les polices).
const STAR = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z";
function Stars({ rating, color }: { rating: number | null; color: string }) {
  if (rating == null) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={50} height={50} viewBox="0 0 24 24">
            <defs>
              <clipPath id={`half-${i}`}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath>
            </defs>
            <path d={STAR} fill="none" stroke={color} strokeWidth="1.2" opacity="0.5" />
            {fill > 0 && <path d={STAR} fill={color} clipPath={`url(#half-${i})`} />}
          </svg>
        );
      })}
    </div>
  );
}

// Une image envoyée par le membre n'a pas d'adresse publique : on l'intègre directement à la carte.
async function inlineImage(url: string | null) {
  if (!url?.startsWith("/media/")) return url;
  const data = await mediaBytes(url);
  if (!data) return null;
  const jpeg = await sharp(data).rotate().resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await getCritique(Number((await params).id));
  if (!c) return new Response("Critique introuvable", { status: 404 });
  const themeKey = (await cookies()).get("theme")?.value ?? "lynch";
  const p = PALETTES[themeKey] ?? PALETTES.yume;

  const filmTitle = c.filmTitleFr ?? c.filmName;
  const headline = c.title || filmTitle;
  const paragraphs = [...(c.lede.trim() ? [c.lede.replace(/\s+/g, " ").trim()] : []), ...plainParagraphs(c.body)];

  const fontData = await loadFont(p.font, `${headline}${filmTitle}Dreams`, p.italic).catch(() => null);
  // Police du texte courant : Inter, pour le texte et les petites mentions.
  const sansData = await loadFont("Inter", `${paragraphs.join("")}${filmTitle} · ${c.year ?? ""}${c.directors.join(", ")}JOURNAL DE CINÉMA`, false).catch(() => null);
  const [bg, cover] = await Promise.all([inlineImage(backdrop(c.backdropPath)), inlineImage(poster(c.posterPath, "w500"))]);

  const image = new ImageResponse(
    (
      <div style={{ width: 1080, minHeight: 1350, display: "flex", flexDirection: "column", background: p.bg, color: p.fg, fontFamily: "Display" }}>
        {/* Bandeau image du film */}
        <div style={{ position: "relative", display: "flex", height: 560 }}>
          {bg && <img src={bg} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 35%, ${p.bg} 100%)` }} />
        </div>

        <div style={{ display: "flex", gap: 44, padding: "0 72px", marginTop: -220 }}>
          {cover && <img src={cover} style={{ width: 250, height: 375, borderRadius: 14, objectFit: "cover", boxShadow: "0 30px 60px rgba(0,0,0,.45)" }} />}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, paddingBottom: 8 }}>
            <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: p.accent, fontFamily: "Sans" }}>
              {`${filmTitle} · ${c.year ?? ""}`}
            </div>
            <div style={{ fontSize: 30, color: p.muted, marginTop: 10, fontFamily: "Sans" }}>{c.directors.join(", ")}</div>
            <Stars rating={c.rating} color={p.accent} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 34, padding: "56px 72px 0", flexGrow: 1 }}>
          <div style={{ fontSize: headline.length > 40 ? 64 : 84, lineHeight: 1.02, fontStyle: p.italic ? "italic" : "normal" }}>{headline}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, fontSize: 34, lineHeight: 1.45, color: p.fg, opacity: 0.85, fontFamily: "Sans" }}>
            {paragraphs.map((t, i) => <div key={i} style={{ display: "flex" }}>{t}</div>)}
          </div>
        </div>

        {/* Signature */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 72px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg viewBox={BRAND_VIEWBOX} width={96} height={56} fill={p.fg}>
              <path d={BRAND_PATH} />
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 40 }}>Dreams</div>
              <div style={{ fontSize: 18, letterSpacing: 6, color: p.muted, fontFamily: "Sans" }}>JOURNAL DE CINÉMA</div>
            </div>
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: p.accent, display: "flex" }} />
        </div>
      </div>
    ),
    {
      width: 1080,
      height: undefined, // sans hauteur imposée, le rendu la calcule d'après le contenu
      fonts: [
        ...(fontData ? [{ name: "Display", data: fontData, style: (p.italic ? "italic" : "normal") as "italic" | "normal" }] : []),
        ...(sansData ? [{ name: "Sans", data: sansData, style: "normal" as const }] : []),
      ],
    },
  );
  // La carte change avec le texte, le fond et le thème : pas de cache (par défaut, le navigateur la garderait un an).
  image.headers.set("Cache-Control", "private, no-store");
  return image;
}
