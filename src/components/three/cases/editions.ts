/*
 * Les éditions physiques, aux dimensions réelles (1 unité = 10 cm).
 *   DVD Amaray        135 × 190 × 14 mm, coque noire, fourreau plastique transparent sur la jaquette
 *   Blu-ray           129 × 148 × 12 mm, coque bleue translucide, bandeau bleu en tête de jaquette
 *   Collector         fourreau carton (dorure à chaud) autour d'un boîtier 4K noir
 *   Steelbook         boîtier métal imprimé, arêtes très arrondies, intérieur illustré
 *   Prestige          boîtier Blu-ray en plastique cristal, jaquette éditoriale numérotée
 *   Digipak           carton plié en livre, plateau transparent, trois interprétations graphiques
 */
export type EditionKey = "dvd" | "dvdclear" | "dvdslim" | "dvddouble" | "bluray" | "collector" | "steelbook" | "prestige" | "digipak";
// Mise en page de la jaquette (boîtiers DVD)
export type JacketTemplate = "affiche" | "edition" | "minimal";
export const JACKETS: { key: JacketTemplate; label: string }[] = [
  { key: "affiche", label: "Affiche" },
  { key: "edition", label: "Éditorial" },
  { key: "minimal", label: "Minimal" },
];

export type Edition = {
  key: EditionKey;
  label: string;
  short: string;
  w: number;
  h: number;
  d: number;
  radius: number;
  body?: "black" | "blue" | "crystal" | "uhd" | "clear";
  discs?: 1 | 2;
  dvd?: boolean; // boîtier DVD (mises en page de jaquette au choix)
  banner?: string; // couleur du bandeau de format (jaquette)
  bannerText?: string;
  bannerShort?: string;
  specs: string;
  opens: "lid" | "slide" | "book";
  blurb: string;
};

export const EDITIONS: Record<EditionKey, Edition> = {
  dvd: { key: "dvd", label: "DVD classique", short: "DVD", w: 1.35, h: 1.9, d: 0.14, radius: 0.025, body: "black", dvd: true, specs: "PAL · 16/9", opens: "lid", blurb: "Coque Amaray noire, moyeu à pétales, attaches du livret, film plastique brillant sur la jaquette." },
  dvdclear: { key: "dvdclear", label: "DVD cristal", short: "Cristal", w: 1.35, h: 1.9, d: 0.14, radius: 0.025, body: "clear", dvd: true, specs: "PAL · 16/9", opens: "lid", blurb: "Coque transparente : on voit le disque, le livret et le revers de la jaquette." },
  dvdslim: { key: "dvdslim", label: "DVD slim", short: "Slim", w: 1.35, h: 1.9, d: 0.07, radius: 0.018, body: "black", dvd: true, specs: "PAL · 16/9", opens: "lid", blurb: "Moitié moins épais (7 mm), pour les coffrets ; moyeu abaissé, pas de livret." },
  dvddouble: { key: "dvddouble", label: "DVD double", short: "2 DVD", w: 1.35, h: 1.9, d: 0.15, radius: 0.025, body: "black", dvd: true, discs: 2, specs: "2 disques · PAL", opens: "lid", blurb: "Deux disques : un plateau pivotant au milieu porte le second." },
  bluray: { key: "bluray", label: "Blu-ray", short: "BD", w: 1.29, h: 1.48, d: 0.12, radius: 0.022, body: "blue", banner: "#1d5fd6", bannerText: "BLU-RAY DISC", bannerShort: "BD", specs: "1080p · 1,85:1", opens: "lid", blurb: "Coque bleue translucide, plus courte, bandeau de format en tête." },
  collector: { key: "collector", label: "Édition collector", short: "Collector", w: 1.33, h: 1.51, d: 0.155, radius: 0.022, body: "uhd", banner: "#0a0a0a", bannerText: "4K ULTRA HD", bannerShort: "4K", specs: "4K UHD · HDR10", opens: "slide", blurb: "Fourreau carton mat à dorure à chaud ; le boîtier 4K noir glisse dehors." },
  steelbook: { key: "steelbook", label: "Steelbook", short: "Steel", w: 1.31, h: 1.52, d: 0.13, radius: 0.06, specs: "4K UHD · Dolby Vision", opens: "lid", blurb: "Métal imprimé, arêtes très arrondies, illustration intérieure." },
  prestige: { key: "prestige", label: "Édition de prestige", short: "Prestige", w: 1.29, h: 1.48, d: 0.13, radius: 0.022, body: "crystal", specs: "Restauration 4K · 1,37:1", opens: "lid", blurb: "Plastique cristal, jaquette éditoriale numérotée, livret." },
  digipak: { key: "digipak", label: "Édition personnalisée", short: "Digipak", w: 1.36, h: 1.87, d: 0.075, radius: 0.004, specs: "Digipak · 2 volets", opens: "book", blurb: "Carton plié en livre, plateau transparent ; trois interprétations graphiques." },
};

export const EDITION_LIST = Object.values(EDITIONS);

// L'édition correspondant à un exemplaire de la collection
export function editionFor(item: { format?: string | null; caseType?: string | null; edition?: string | null } | null): EditionKey {
  if (!item) return "dvd";
  if (item.caseType === "steelbook") return "steelbook";
  if (item.caseType === "digipack") return "digipak";
  if (item.caseType === "coffret" || /collector/i.test(item.edition ?? "")) return "collector";
  if (/criterion|carlotta|prestige|restaur/i.test(item.edition ?? "")) return "prestige";
  if (item.format === "DVD") return /double|2 dvd|deux/i.test(item.edition ?? "") ? "dvddouble" : "dvd";
  return "bluray";
}
