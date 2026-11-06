import type { ObjectDesign } from "./design-types";

/*
 * Les couleurs de « La Collection Dreams » : module pur, partagé par l'imprimerie 3D (jaquettes)
 * et les étagères en HTML (tranches). Elles ne dépendent que du film (sa couleur, ses images) et
 * du design choisi par le membre — jamais du thème du site, jamais du hasard.
 */
export type JacketStyle =
  "cadre" | "plein" | "typo" | "affiche" | "bande" | "bichromie";
type StyledFilm = {
  id: number;
  title: string;
  backdrop: string | null;
  poster: string | null;
  design?: ObjectDesign;
};

export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
// La maquette d'un film : toujours la même pour un film donné ; sans image, on reste typographique
export function jacketStyle(film: StyledFilm): JacketStyle {
  if (film.design?.case?.style) return film.design.case.style;
  if (!film.backdrop && !film.poster) return "typo";
  const order: JacketStyle[] = film.backdrop
    ? ["cadre", "plein", "typo", "affiche", "bande", "bichromie"]
    : ["affiche", "typo"];
  return order[hash(`${film.id}${film.title}`) % order.length];
}
export const collectionNumber = (id: number) => String(id).padStart(4, "0");

/* --- couleurs --- */
export const INK = "#121110";
export const hex = (c: string | null | undefined, f = "#3b3632") =>
  c && /^#[0-9a-f]{6}$/i.test(c) ? c : f;
export const rgb = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const lum = (c: string) => {
  const [r, g, b] = rgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
// assombrit une couleur pour en faire un fond d'impression profond (jamais criard)
export function deep(c: string, target = 0.2) {
  const [r, g, b] = rgb(c);
  const l = lum(c) || 0.01;
  const k = Math.min(1, target / l);
  const s = (v: number) => Math.round(v * k * 0.92 + 8);
  return `rgb(${s(r)},${s(g)},${s(b)})`;
}
export const PAPER = "#ebe7de";
// le papier de la jaquette, à peine teinté par la couleur du film (12 %)
export function paper(c: string) {
  const [r, g, b] = rgb(c);
  const [pr, pg, pb] = rgb(PAPER);
  const m = (x: number, y: number) => Math.round(x * 0.88 + y * 0.12);
  return `rgb(${m(pr, r)},${m(pg, g)},${m(pb, b)})`;
}
// les couleurs d'une jaquette ne dépendent que du film (jamais du thème du site) :
// tranche dans la couleur profonde du film, papier teinté, fonds sombres « noir du film »
export function filmPalette(c: string | null | undefined, style: JacketStyle) {
  const col = hex(c);
  const light = "#ece8e0";
  switch (style) {
    case "cadre": // tranche papier, encre noire
      return {
        bg: paper(col),
        ink: INK,
        soft: "#6d665c",
        spine: paper(col),
        spineInk: INK,
        back: paper(col),
      };
    case "affiche": // tranche dans la couleur franche du film
      return {
        bg: paper(col),
        ink: INK,
        soft: "#6d665c",
        spine: vivid(col),
        spineInk: lum(col) > 0.6 ? INK : light,
        back: paper(col),
      };
    case "typo": // la couleur profonde de la face se prolonge sur la tranche
      return {
        bg: deep(col, 0.18),
        ink: "#efe9dd",
        soft: "rgba(239,233,221,.62)",
        spine: deep(col, 0.2),
        spineInk: "#efe9dd",
        back: deep(col, 0.08),
      };
    case "bichromie": // tranche crème, encre de la couleur du film
      return {
        bg: deep(col, 0.1),
        ink: "#f1ece2",
        soft: "rgba(241,236,226,.6)",
        spine: "#ece4d4",
        spineInk: deep(col, 0.1),
        back: deep(col, 0.07),
      };
    case "bande": // tranche noire, titre dans la couleur du film
      return {
        bg: deep(col, 0.07),
        ink: "#ece9e2",
        soft: "rgba(236,233,226,.55)",
        spine: "#0f0e0d",
        spineInk: tint(col),
        back: deep(col, 0.07),
      };
    default: // plein cadre : le noir du film
      return {
        bg: deep(col, 0.06),
        ink: "#efebe3",
        soft: "rgba(239,235,227,.6)",
        spine: deep(col, 0.09),
        spineInk: light,
        back: deep(col, 0.06),
      };
  }
}
// la couleur du film, rendue franche (ni trop sombre, ni délavée) pour une tranche colorée
function vivid(c: string) {
  const [r, g, b] = rgb(c);
  const max = Math.max(r, g, b, 1),
    min = Math.min(r, g, b);
  const sat = (max - min) / max;
  const k = 200 / max;
  const boost = (v: number) =>
    Math.round(
      Math.max(
        0,
        Math.min(
          255,
          (max - (max - v) * Math.min(1.6, 0.55 / Math.max(sat, 0.15))) * k,
        ),
      ),
    );
  return `rgb(${boost(r)},${boost(g)},${boost(b)})`;
}
// une encre claire teintée par la couleur du film (lisible sur le noir)
function tint(c: string) {
  const [r, g, b] = rgb(c);
  const m = (v: number) =>
    Math.round(235 * 0.55 + Math.min(255, v * 1.2) * 0.45);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

// La tranche d'un film : celle du design du membre, sinon celle de sa maquette
export function spineLook(
  film: StyledFilm & { color?: string | null; director?: string | null },
) {
  const style = jacketStyle(film);
  const SP = film.design?.case?.spine ?? {};
  const pal = filmPalette(film.color, style);
  return {
    style,
    title:
      SP.title?.trim() || film.design?.case?.front?.title?.trim() || film.title,
    dir: SP.showDirector === false ? "" : (film.director ?? ""),
    num: collectionNumber(film.id),
    bg: SP.bg ?? pal.spine,
    ink: SP.ink ?? pal.spineInk,
    showNumber: SP.showNumber !== false,
  };
}
