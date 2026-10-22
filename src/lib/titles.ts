// Titres des films en plusieurs langues : le titre original en grand, la traduction choisie en petit à côté.

export const TITLE_LANGS = [
  { code: "fr", label: "Français", region: "FR" },
  { code: "en", label: "English", region: "US" },
  { code: "es", label: "Español", region: "ES" },
  { code: "it", label: "Italiano", region: "IT" },
  { code: "de", label: "Deutsch", region: "DE" },
  { code: "pt", label: "Português", region: "BR" },
  { code: "ja", label: "日本語", region: "JP" },
  { code: "ko", label: "한국어", region: "KR" },
  { code: "zh", label: "中文", region: "CN" },
] as const;

export type TitleLang = (typeof TITLE_LANGS)[number]["code"] | "none";
export const isTitleLang = (v: string): v is TitleLang => v === "none" || TITLE_LANGS.some((l) => l.code === v);

export type TitledFilm = {
  name: string;
  title_fr?: string | null;
  original_title?: string | null;
  titles?: string | Record<string, string> | null;
};

const parseTitles = (t: TitledFilm["titles"]): Record<string, string> => {
  if (!t) return {};
  if (typeof t !== "string") return t;
  try {
    return JSON.parse(t);
  } catch {
    return {};
  }
};

// Le titre dans une langue donnée (avec ce qu'on connaît déjà : titre français, titre anglais de Letterboxd).
export function titleIn(film: TitledFilm, lang: string): string | null {
  const t = parseTitles(film.titles);
  if (t[lang]) return t[lang];
  if (lang === "fr") return film.title_fr ?? null;
  if (lang === "en") return film.name;
  return null;
}

// { main: titre original, sub: titre traduit s'il est différent }
export function filmTitles(film: TitledFilm, lang: TitleLang) {
  const main = film.original_title || film.name;
  const translated = lang === "none" ? null : titleIn(film, lang);
  const sub = translated && normalize(translated) !== normalize(main) ? translated : null;
  return { main, sub };
}

// Texte comparable : minuscules, sans accents ni ponctuation (« Cléo de 5 à 7 » → « cleo de 5 a 7 »).
export function normalize(s: string) {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Une recherche commence à 2 lettres, mais un seul caractère suffit en japonais, chinois, coréen (« 夢 »).
export const longEnough = (q: string) => q.trim().length >= 2 || /[぀-ヿ㐀-鿿가-힯]/.test(q);

// Tous les titres connus d'un film, réunis pour la recherche.
export function searchText(film: TitledFilm) {
  const all = [film.name, film.title_fr, film.original_title, ...Object.values(parseTitles(film.titles))];
  return [...new Set(all.filter(Boolean).map((t) => normalize(t!)))].join(" | ");
}

// Les titres utiles parmi les traductions TMDB.
export function pickTranslations(
  translations: { iso_639_1: string; iso_3166_1: string; data?: { title?: string } }[],
  original: { language: string; title: string },
) {
  const out: Record<string, string> = {};
  for (const { code, region } of TITLE_LANGS) {
    const matches = translations.filter((t) => t.iso_639_1 === code && t.data?.title);
    const best = matches.find((t) => t.iso_3166_1 === region) ?? matches[0];
    if (best) out[code] = best.data!.title!;
    else if (original.language === code) out[code] = original.title;
  }
  return out;
}
