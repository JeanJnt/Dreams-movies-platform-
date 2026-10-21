// Liens vers des critiques écrites, des vidéos et des offres légales pour chaque film.

type FilmRef = { name: string; title_fr: string | null; original_title: string | null; year: number | null; directors: string[] };

export type ArticleSource = { name: string; domain: string; lang: "fr" | "en"; description: string };

export const ARTICLE_SOURCES: ArticleSource[] = [
  { name: "DVDClassik", domain: "dvdclassik.com", lang: "fr", description: "Critiques de fond, cinéma classique" },
  { name: "Critikat", domain: "critikat.com", lang: "fr", description: "Analyses exigeantes" },
  { name: "Cahiers du cinéma", domain: "cahiersducinema.com", lang: "fr", description: "La revue de référence" },
  { name: "Télérama", domain: "telerama.fr", lang: "fr", description: "Critiques presse" },
  { name: "Les Inrocks", domain: "lesinrocks.com", lang: "fr", description: "Critiques presse" },
  { name: "Le Monde", domain: "lemonde.fr", lang: "fr", description: "Critiques presse" },
  { name: "RogerEbert.com", domain: "rogerebert.com", lang: "en", description: "Roger Ebert et son équipe" },
  { name: "Criterion", domain: "criterion.com", lang: "en", description: "Essais de The Current" },
  { name: "Senses of Cinema", domain: "sensesofcinema.com", lang: "en", description: "Revue universitaire" },
];

const quoted = (s: string) => `"${s}"`;

// Une recherche Google limitée au site donne directement la bonne page, même sans connaître son adresse exacte.
export function articleUrl(source: ArticleSource, film: FilmRef) {
  const title = source.lang === "fr" ? film.title_fr ?? film.name : film.original_title ?? film.name;
  const director = film.directors[0] ?? "";
  const q = `site:${source.domain} ${quoted(title)} ${director}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export const LEGAL_FREE = [
  { name: "Arte", domain: "arte.tv" },
  { name: "france.tv", domain: "france.tv" },
  { name: "LaCinetek", domain: "lacinetek.com" },
  { name: "Henri (Cinémathèque)", domain: "cinematheque.fr/henri" },
];

export function legalSearchUrl(domain: string, film: FilmRef) {
  const q = `site:${domain} ${quoted(film.title_fr ?? film.name)}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export const youtubeSearchUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

// --- Vidéos critiques YouTube ---

export type Video = { id: string; title: string; channel: string; thumbnail: string; duration: number; publishedAt: string };

const NOT_A_REVIEW = /(bande[- ]?annonce|trailer|teaser|official clip|extrait|clip officiel|#shorts|making[- ]of|featurette|full movie|film complet)/i;

function isoDurationToSeconds(iso: string) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

const decode = (s: string) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// Seulement des sources reconnues : revues, institutions, émissions et vidéastes réputés pour leurs analyses.
export const TRUSTED_CHANNELS: { name: string; match: RegExp }[] = [
  { name: "Arte / Blow Up", match: /\barte\b|blow ?up/i },
  { name: "Cahiers du cinéma", match: /cahiers du cin/i },
  { name: "Cinémathèque française", match: /cin[ée]math[eè]que/i },
  { name: "France Culture", match: /france culture/i },
  { name: "France Inter (Le Masque et la Plume)", match: /france inter|masque et la plume/i },
  { name: "Institut Lumière", match: /institut lumi[eè]re/i },
  { name: "Forum des images", match: /forum des images/i },
  { name: "Le Ciné-club de M. Bobine", match: /cin[ée]-?club de m/i },
  { name: "Criterion Collection", match: /criterion/i },
  { name: "BFI", match: /^bfi\b/i },
  { name: "Sight and Sound", match: /sight (and|&) sound/i },
  { name: "Film at Lincoln Center", match: /lincoln center/i },
  { name: "TIFF Originals", match: /^tiff/i },
  { name: "Every Frame a Painting", match: /every frame a painting/i },
  { name: "Nerdwriter", match: /nerdwriter/i },
  { name: "Lessons from the Screenplay", match: /lessons from the screenplay/i },
  { name: "Like Stories of Old", match: /like stories of old/i },
  { name: "Thomas Flight", match: /thomas flight/i },
  { name: "CinemaTyler", match: /cinematyler/i },
  { name: "The Royal Ocean Film Society", match: /royal ocean/i },
  { name: "Channel Criswell", match: /channel criswell/i },
  { name: "Accented Cinema", match: /accented cinema/i },
];

const isTrusted = (channel: string) => TRUSTED_CHANNELS.some((c) => c.match.test(channel));

type SearchItem = { id: { videoId: string }; snippet: { channelTitle: string } };

export async function reviewVideos(film: FilmRef): Promise<Video[] | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const director = film.directors[0] ?? "";
  // Une recherche en français et une en anglais, 50 résultats chacune, puis on ne garde que les sources reconnues.
  const queries = [
    { q: `${film.title_fr ?? film.name} ${director}`, lang: "fr" },
    { q: `${film.original_title ?? film.name} ${director} analysis`, lang: "en" },
  ];
  // Les résultats sont gardés en cache 7 jours : on ne consomme le quota YouTube qu'une fois par film.
  const cache = { next: { revalidate: 60 * 60 * 24 * 7 } };
  try {
    const searches = await Promise.all(
      queries.map((s) =>
        fetch(
          `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({
            part: "snippet", type: "video", maxResults: "50", q: s.q, relevanceLanguage: s.lang, key,
          })}`,
          cache,
        ),
      ),
    );
    if (searches.every((s) => !s.ok)) return null;
    const all: SearchItem[] = (await Promise.all(searches.filter((s) => s.ok).map((s) => s.json()))).flatMap((j) => j.items ?? []);
    const items = [...new Map(all.filter((i) => isTrusted(i.snippet.channelTitle)).map((i) => [i.id.videoId, i])).values()];
    if (!items.length) return [];

    // Deuxième appel (presque gratuit) pour connaître la durée et écarter les Shorts.
    const details = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
        part: "snippet,contentDetails", id: items.slice(0, 50).map((i) => i.id.videoId).join(","), key,
      })}`,
      cache,
    );
    if (!details.ok) return null;
    const videos: {
      id: string;
      snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { medium?: { url: string }; high?: { url: string } } };
      contentDetails: { duration: string };
    }[] = (await details.json()).items ?? [];

    return videos
      .map((v) => ({
        id: v.id,
        title: decode(v.snippet.title),
        channel: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails.high?.url ?? v.snippet.thumbnails.medium?.url ?? "",
        duration: isoDurationToSeconds(v.contentDetails.duration),
        publishedAt: v.snippet.publishedAt,
      }))
      .filter((v) => v.duration >= 180 && !NOT_A_REVIEW.test(v.title))
      .slice(0, 8);
  } catch {
    return null;
  }
}
