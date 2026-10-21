const BASE = "https://api.themoviedb.org/3";

export async function tmdb<T>(path: string, params: Record<string, string> = {}, retries = 3, init?: RequestInit): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY manquante dans .env.local");
  const url = new URL(BASE + path);
  url.search = new URLSearchParams({ api_key: key, language: "fr-FR", ...params }).toString();

  const res = await fetch(url, init);
  if (res.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, 1000));
    return tmdb(path, params, retries - 1, init);
  }
  if (!res.ok) throw new Error(`TMDB ${res.status} sur ${path}`);
  return res.json() as Promise<T>;
}

export type Provider = { provider_id: number; provider_name: string; logo_path: string };
export type WatchProviders = { link: string; flatrate: Provider[]; rent: Provider[]; buy: Provider[] };

// Plateformes légales où voir le film en France (données JustWatch, via TMDB).
export async function watchProviders(tmdbId: number): Promise<WatchProviders | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/movie/${tmdbId}/watch/providers?api_key=${key}`, {
      next: { revalidate: 60 * 60 * 24 }, // mis en cache 24 h
    });
    if (!res.ok) return null;
    const fr = (await res.json()).results?.FR;
    if (!fr) return null;
    return { link: fr.link, flatrate: fr.flatrate ?? [], rent: fr.rent ?? [], buy: fr.buy ?? [] };
  } catch {
    return null;
  }
}

// Une affiche est soit un chemin TMDB (« /abc.jpg »), soit une image envoyée par moi (« /media/… »).
export const poster = (p: string | null | undefined, size: "w185" | "w342" | "w500" | "original" = "w342") =>
  !p ? null : p.startsWith("/media/") ? p : `https://image.tmdb.org/t/p/${size}${p}`;

export const backdrop = (p: string | null | undefined) => (p ? `https://image.tmdb.org/t/p/w1280${p}` : null);
