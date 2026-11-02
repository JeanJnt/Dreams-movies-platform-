/*
 * Découpe une critique en cartes de partage (1080 × 1350), pour que tout le texte y figure, comme un carrousel Instagram.
 * Le rendu d'image ne sait pas dire si un texte déborde : on estime donc les lignes à l'avance, en comptant large,
 * et chaque carte ne reçoit que ce qui y tient à coup sûr.
 */

export const TEXT_SIZE = 34;
export const TEXT_LINE = TEXT_SIZE * 1.45;
export const TEXT_GAP = 22; // entre deux paragraphes
const TEXT_WIDTH = 936; // 1080 moins les marges

// Hauteurs fixes de la carte (voir carte/route.tsx)
const FIRST_TOP = 771; // image, affiche et marge au-dessus du titre
const NEXT_TOP = 142; // marge et rappel du film
const FOOTER = 168; // signature
const HEADLINE_GAP = 34;

export const headlineSize = (headline: string) => (headline.length > 40 ? 64 : 84);

// Largeur d'un caractère de la police du texte (Inter), arrondie au-dessus, en proportion de sa taille.
const charWidth = (c: string) => ("iljI.,;:'’!|tfr ()[]/".includes(c) ? 0.36 : "mwMWÆŒ@%".includes(c) ? 0.92 : c >= "A" && c <= "Z" ? 0.72 : 0.6);
const textWidth = (s: string) => [...s].reduce((w, c) => w + charWidth(c) * TEXT_SIZE, 0);

function wrap(paragraph: string) {
  const lines: string[] = [];
  for (const word of paragraph.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && textWidth(`${last} ${word}`) <= TEXT_WIDTH) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

// Le texte en paragraphes, sans la mise en forme Markdown (les tirets de « peut-être » restent).
export function plainParagraphs(markdown: string) {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/^\s*```.*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .filter((line) => !/^\s*([-*_])\1{2,}\s*$/.test(line))
        .map((line) => line.replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+)+/, ""))
        .join(" ")
        .replace(/(\*\*|\*|~~)(?=\S)(.+?)(?<=\S)\1/g, "$2")
        .replace(/(^|[\s(«"])(__?)(?=\S)(.+?)(?<=\S)\2(?=$|[\s.,;:!?)»"])/g, "$1$3")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

// Les cartes d'une critique : pour chacune, ses paragraphes. Un paragraphe trop long continue sur la carte suivante.
export function cardPages({ headline, lede, body }: { headline: string; lede: string; body: string }) {
  const size = headlineSize(headline);
  const headlineLines = Math.ceil(([...headline].length * size * 0.75) / TEXT_WIDTH);
  const firstHeight = 1350 - FIRST_TOP - FOOTER - HEADLINE_GAP - headlineLines * size * 1.02;
  const nextHeight = 1350 - NEXT_TOP - FOOTER - 8;

  const pages: string[][] = [[]];
  let used = 0;
  const paragraphs = [...(lede.trim() ? [lede.replace(/\s+/g, " ").trim()] : []), ...plainParagraphs(body)];
  for (const paragraph of paragraphs) {
    let fragment: string[] = [];
    let gap = pages[pages.length - 1].length ? TEXT_GAP : 0;
    for (const line of wrap(paragraph)) {
      const height = pages.length === 1 ? firstHeight : nextHeight;
      if (used + gap + TEXT_LINE > height) {
        if (fragment.length) pages[pages.length - 1].push(fragment.join(" "));
        fragment = [];
        pages.push([]);
        used = 0;
        gap = 0;
      }
      used += gap + TEXT_LINE;
      gap = 0;
      fragment.push(line);
    }
    if (fragment.length) pages[pages.length - 1].push(fragment.join(" "));
  }
  return pages;
}
