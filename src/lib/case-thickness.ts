/*
 * L'épaisseur du boîtier DVD d'un film, d'après les formats réels du marché (boîtiers Amaray) :
 *    7 mm  slim       1 disque   court métrage (< 75 min)
 *   14 mm  standard   1 disque   le cas courant
 *   19 mm  double     2 disques  film-fleuve (> 165 min), ou édition « 2 DVD », « double », « spéciale »
 *   22 mm  triple     3 disques  édition « collector », « ultimate », « coffret »
 *   27 mm  quadruple  4 disques  série, « intégrale », « saison »
 * Rien d'arbitraire : la même règle donne toujours la même épaisseur pour le même film et la même édition.
 * La jaquette suit : sa tranche mesure l'épaisseur du boîtier moins 0,5 mm.
 */
export type CaseSize = { mm: number; discs: number; name: string };

export const CASE_SIZES: Record<string, CaseSize> = {
  slim: { mm: 7, discs: 1, name: "Slim" },
  standard: { mm: 14, discs: 1, name: "Standard" },
  double: { mm: 19, discs: 2, name: "Double" },
  triple: { mm: 22, discs: 3, name: "Collector" },
  quad: { mm: 27, discs: 4, name: "Intégrale" },
};

export function caseSize(f: { runtime?: number | null; mediaType?: string | null; edition?: string | null; caseType?: string | null }): CaseSize {
  const ed = (f.edition ?? "").toLowerCase();
  if (f.mediaType === "tv" || /intégrale|integrale|saison|season|complete/.test(ed)) return CASE_SIZES.quad;
  if (/collector|ultimate|coffret|prestige/.test(ed) || f.caseType === "coffret") return CASE_SIZES.triple;
  if (/2 ?dvd|double|spéciale|speciale|deux disques/.test(ed) || (f.runtime ?? 0) > 165) return CASE_SIZES.double;
  if (f.runtime != null && f.runtime > 0 && f.runtime < 75) return CASE_SIZES.slim;
  return CASE_SIZES.standard;
}
