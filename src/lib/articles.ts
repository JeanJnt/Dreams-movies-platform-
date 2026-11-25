import { ARTICLE_SOURCES } from "./sources";

/*
 * De vrais articles sur un film (critiques, analyses, entretiens), trouvés par Google Actualités (flux RSS public, sans clé)
 * et limités aux revues de confiance de ARTICLE_SOURCES : Cahiers du cinéma, Critikat, Télérama, Le Monde, RogerEbert.com…
 * Mis en cache un jour. En cas d'échec, une liste vide : la page s'affiche sans.
 */
export type Article = { title: string; source: string; url: string; date: string | null };

type FilmRef = { name: string; title_fr: string | null; original_title?: string | null; year: number | null; director?: string | null };

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? null;

export async function filmArticles(film: FilmRef, limit = 3): Promise<Article[]> {
  const title = film.title_fr ?? film.name;
  const original = film.original_title && film.original_title !== title ? ` OR "${film.original_title}"` : "";
  const sites = ARTICLE_SOURCES.map((s) => `site:${s.domain}`).join(" OR ");
  const q = `("${title}"${original}) ${film.director ?? ""} (${sites})`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Dreams)" }, signal: AbortSignal.timeout(5000), next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const xml = await res.text();
    const seen = new Set<string>();
    const out: Article[] = [];
    for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const source = decode(tag(item, "source") ?? "");
      // Le titre se termine par « - Nom de la revue » : on le retire
      const raw = decode(tag(item, "title") ?? "");
      const clean = source && raw.endsWith(` - ${source}`) ? raw.slice(0, -(source.length + 3)) : raw.replace(/\s+-\s+[^-]+$/, "");
      const link = decode(tag(item, "link") ?? "");
      if (!clean || !link.startsWith("https://") || seen.has(clean)) continue;
      seen.add(clean);
      const pub = tag(item, "pubDate");
      out.push({ title: clean, source, url: link, date: pub ? new Date(pub).toISOString().slice(0, 10) : null });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
