import { tmdb } from "./tmdb";

// Ce que le code-barres nous apprend sur l'édition : titre du produit, format, boîtier, éditeur, photo.
export type ProductGuess = {
  ean: string;
  productTitle: string | null;
  query: string; // titre nettoyé, pour chercher le film
  format: string;
  caseType: string;
  edition: string | null;
  cover: string | null;
};

export type FilmCandidate = { tmdbId: number; title: string; originalTitle: string; year: number | null; poster: string | null };

const EDITORS = ["Criterion", "Carlotta", "Arrow", "Wild Side", "ESC", "Potemkine", "Gaumont", "StudioCanal", "Le Chat qui fume", "Rimini", "Eureka", "Masters of Cinema", "BFI", "Shout Factory", "Kino Lorber", "Spectrum"];

export function guessFromTitle(raw: string) {
  const t = raw;
  const format = /4k|uhd|ultra hd/i.test(t) ? "Blu-ray 4K" : /blu-?ray|bd\b/i.test(t) ? "Blu-ray" : /vhs/i.test(t) ? "VHS" : /digital|numérique/i.test(t) ? "Numérique" : "DVD";
  const caseType = /steel ?book/i.test(t) ? "steelbook" : /digi ?pa(c)?k|mediabook/i.test(t) ? "digipack" : /coffret|box ?set|collector|trilog|int[ée]grale/i.test(t) ? "coffret" : "amaray";
  const edition = EDITORS.find((e) => t.toLowerCase().includes(e.toLowerCase())) ?? null;
  // On retire tout ce qui n'est pas le titre du film : [Blu-ray], (Édition collector), « Steelbook », etc.
  const query = t
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/\b(blu-?ray|dvd|4k|uhd|ultra hd|steel ?book|digi ?pa(c)?k|combo|édition|edition|collector|special|spéciale|limited|limitée|widescreen|remastered|restaur[ée]+|version|import|region \w+|coffret|box ?set|the criterion collection|criterion)\b/gi, " ")
    .replace(/[-–:|+].*$/, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { format, caseType, edition, query };
}

export async function lookupBarcode(ean: string): Promise<ProductGuess> {
  let productTitle: string | null = null;
  let cover: string | null = null;
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(ean)}`, { next: { revalidate: 60 * 60 * 24 * 30 } });
    if (res.ok) {
      const item = (await res.json()).items?.[0];
      if (item) {
        productTitle = item.title ?? null;
        cover = (item.images as string[] | undefined)?.find((u) => u.startsWith("https://")) ?? null;
      }
    }
  } catch {
    // service injoignable : l'utilisateur tapera le titre
  }
  const guess = productTitle ? guessFromTitle(productTitle) : { format: "Blu-ray", caseType: "amaray", edition: null, query: "" };
  return { ean, productTitle, cover, ...guess };
}

export async function searchFilms(query: string): Promise<FilmCandidate[]> {
  if (!query.trim()) return [];
  const res = await tmdb<{ results: { id: number; title: string; original_title: string; release_date?: string; poster_path: string | null }[] }>(
    "/search/movie",
    { query },
  );
  return res.results.slice(0, 6).map((r) => ({
    tmdbId: r.id,
    title: r.title,
    originalTitle: r.original_title,
    year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    poster: r.poster_path ? `https://image.tmdb.org/t/p/w185${r.poster_path}` : null,
  }));
}
