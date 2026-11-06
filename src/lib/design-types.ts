/*
 * La personnalisation des objets d'un film, par membre : le boîtier (jaquette : face, dos, tranche) et le disque.
 * Module pur (sans serveur, sans navigateur) : partagé par l'imprimerie 3D, l'éditeur et la base.
 *
 * Chaque champ absent garde le rendu automatique de « La Collection Dreams » : un design vide = l'habillage d'origine.
 */

export type JacketStyleKey =
  "cadre" | "plein" | "typo" | "affiche" | "bande" | "bichromie";

export type CaseDesign = {
  style?: JacketStyleKey; // la maquette de la face
  front?: {
    image?: string; // image du membre, déjà recadrée au format exact de la face (1295 × 1830)
    showTitle?: boolean; // false : la face sans titre
    title?: string; // titre affiché (sinon le titre du film)
    subtitle?: string; // ligne sous le titre (sinon le titre original s'il diffère)
    showHead?: boolean; // « UN FILM DE … » en tête
    showFoot?: boolean; // l'étoile et « La Collection Dreams · N° »
  };
  back?: {
    image?: string; // photogramme du dos, recadré au format 2:1
    text?: string; // texte du dos (sinon le synopsis)
    showCredits?: boolean; // générique et caractéristiques
    bg?: string; // couleur du dos
  };
  spine?: {
    bg?: string; // couleur de la tranche
    ink?: string; // couleur du texte
    title?: string; // texte de la tranche (sinon le titre)
    showDirector?: boolean;
    showNumber?: boolean;
  };
};

export const DISC_FONTS = [
  { key: "display", label: "Bodoni" },
  { key: "bungee", label: "Bungee" },
  { key: "sans", label: "Jost" },
  { key: "mono", label: "Mono" },
] as const;
export type DiscFont = (typeof DISC_FONTS)[number]["key"];

export const DISC_CONTENTS = [
  { key: "title", label: "Titre" },
  { key: "original", label: "Titre original" },
  { key: "director", label: "Réalisateur" },
  { key: "year", label: "Année" },
  { key: "legal", label: "Mentions (durée, zone…)" },
  { key: "number", label: "N° de collection" },
  { key: "custom", label: "Texte libre" },
] as const;
export type DiscContent = (typeof DISC_CONTENTS)[number]["key"];

export type DiscText = {
  id: string;
  content: DiscContent;
  custom?: string;
  mode: "arc" | "straight"; // courbé le long du disque, ou droit
  radius: number; // distance au centre, en mm (21,5 → 58)
  angle: number; // position autour du centre, en degrés (0 = en haut, sens horaire)
  size: number; // hauteur du corps, en mm
  spacing: number; // espacement des lettres, en fraction du corps (0 → 0,6)
  direction: "out" | "in"; // arc : « out » se lit en haut (sens horaire), « in » se lit en bas (sens inverse)
  font: DiscFont;
  upper?: boolean;
  color?: string; // sinon l'encre du disque
};

export type DiscDesign = {
  bg: "silver" | "color" | "image"; // argent : on imprime sur le miroir, le métal reste visible
  bgColor: string;
  ink: string;
  image?: string; // image du membre, recadrée en carré sur la zone imprimée
  useFilmImage?: "backdrop" | "poster" | null; // sinon : une image du film
  imageFit: "full" | "half"; // tout le disque, ou la moitié haute
  imageFilter: "none" | "mono" | "duo";
  imageOpacity: number;
  inner: number; // zone imprimée : rayon intérieur (mm, ≥ 21,5)
  outer: number; // rayon extérieur (mm, ≤ 58)
  graphic: "none" | "rings" | "grooves" | "bands" | "edge";
  texts: DiscText[]; // tableau vide : un disque sans aucun texte
};

export type ObjectDesign = { case?: CaseDesign; disc?: DiscDesign };

export const DISC_ZONE = { min: 21.5, max: 58 };
export const FRONT_SIZE = { w: 1295, h: 1830 };
export const BACK_SIZE = { w: 1100, h: 550 };
export const DISC_IMAGE = 1600;

const isHex = (c: unknown): c is string =>
  typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : undefined;
const num = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(hi, Math.max(lo, v))
    : d;
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T =>
  list.includes(v as T) ? (v as T) : d;
// une image : uniquement une image envoyée par le membre lui-même (« /media/<uid>/… »)
const img = (v: unknown, uid: number) =>
  typeof v === "string" &&
  new RegExp(`^/media/${uid}/\\d+/(cover|backdrop|disc)-[\\w-]+\\.\\w+$`).test(
    v,
  )
    ? v
    : undefined;
const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

const STYLES: JacketStyleKey[] = [
  "cadre",
  "plein",
  "typo",
  "affiche",
  "bande",
  "bichromie",
];

// Valide un design reçu du navigateur : tout champ inconnu ou hors bornes est retiré ou ramené dans les bornes.
export function sanitizeDesign(raw: unknown, uid: number): ObjectDesign {
  const r = (raw ?? {}) as Record<
    string,
    Record<string, Record<string, unknown> | unknown>
  >;
  const out: ObjectDesign = {};
  const c = r.case as Record<string, Record<string, unknown>> | undefined;
  if (c && typeof c === "object") {
    const f = c.front ?? {},
      b = c.back ?? {},
      s = c.spine ?? {};
    out.case = clean({
      style: STYLES.includes(c.style as unknown as JacketStyleKey)
        ? (c.style as unknown as JacketStyleKey)
        : undefined,
      front: clean({
        image: img(f.image, uid),
        showTitle: bool(f.showTitle),
        title: str(f.title, 120),
        subtitle: str(f.subtitle, 120),
        showHead: bool(f.showHead),
        showFoot: bool(f.showFoot),
      }),
      back: clean({
        image: img(b.image, uid),
        text: str(b.text, 1400),
        showCredits: bool(b.showCredits),
        bg: isHex(b.bg) ? b.bg : undefined,
      }),
      spine: clean({
        bg: isHex(s.bg) ? s.bg : undefined,
        ink: isHex(s.ink) ? s.ink : undefined,
        title: str(s.title, 80),
        showDirector: bool(s.showDirector),
        showNumber: bool(s.showNumber),
      }),
    });
  }
  const d = r.disc as Record<string, unknown> | undefined;
  if (d && typeof d === "object") {
    const inner = num(d.inner, DISC_ZONE.min, 50, DISC_ZONE.min);
    out.disc = {
      bg: oneOf(d.bg, ["silver", "color", "image"] as const, "color"),
      bgColor: isHex(d.bgColor) ? d.bgColor : "#141414",
      ink: isHex(d.ink) ? d.ink : "#f2efe8",
      image: img(d.image, uid),
      useFilmImage:
        d.useFilmImage === "backdrop" || d.useFilmImage === "poster"
          ? d.useFilmImage
          : null,
      imageFit: oneOf(d.imageFit, ["full", "half"] as const, "full"),
      imageFilter: oneOf(
        d.imageFilter,
        ["none", "mono", "duo"] as const,
        "none",
      ),
      imageOpacity: num(d.imageOpacity, 0, 1, 1),
      inner,
      outer: num(d.outer, inner + 6, DISC_ZONE.max, DISC_ZONE.max),
      graphic: oneOf(
        d.graphic,
        ["none", "rings", "grooves", "bands", "edge"] as const,
        "none",
      ),
      texts: (Array.isArray(d.texts) ? d.texts : [])
        .slice(0, 8)
        .map((t: Record<string, unknown>, i) => ({
          id: str(t.id, 24) || `t${i}`,
          content: oneOf(
            t.content,
            DISC_CONTENTS.map((x) => x.key),
            "title",
          ),
          custom: str(t.custom, 120),
          mode: oneOf(t.mode, ["arc", "straight"] as const, "straight"),
          radius: num(t.radius, 0, DISC_ZONE.max, 40),
          angle: num(t.angle, -360, 360, 0),
          size: num(t.size, 1.5, 14, 4),
          spacing: num(t.spacing, 0, 0.8, 0.05),
          direction: oneOf(t.direction, ["out", "in"] as const, "out"),
          font: oneOf(
            t.font,
            DISC_FONTS.map((x) => x.key),
            "display",
          ),
          upper: bool(t.upper),
          color: isHex(t.color) ? t.color : undefined,
        })),
    };
  }
  return out;
}

// Toutes les images envoyées qu'un design utilise (pour supprimer celles qui ne servent plus)
export function designImages(d: ObjectDesign | null | undefined) {
  return [d?.case?.front?.image, d?.case?.back?.image, d?.disc?.image].filter(
    (x): x is string => Boolean(x),
  );
}
