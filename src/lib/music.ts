// La plateforme de musique du membre (Mon compte) : la bande originale des fiches film renvoie vers elle.
// L'album est trouvé sur Deezer (API publique, sans clé, voir lib/deezer.ts).

export const MUSIC_PLATFORMS = [
  { key: "deezer", label: "Deezer" },
  { key: "spotify", label: "Spotify" },
] as const;

export type MusicPlatform = (typeof MUSIC_PLATFORMS)[number]["key"];

export const isMusicPlatform = (v: string): v is MusicPlatform => MUSIC_PLATFORMS.some((p) => p.key === v);
export const musicPlatformLabel = (k: MusicPlatform) => MUSIC_PLATFORMS.find((p) => p.key === k)!.label;

// Recherche d'albums sur la plateforme : avec le titre exact de l'album et le compositeur, l'album sort en premier.
export const musicSearchUrl = (platform: MusicPlatform, query: string) =>
  platform === "spotify"
    ? `https://open.spotify.com/search/${encodeURIComponent(query)}/albums`
    : `https://www.deezer.com/search/${encodeURIComponent(query)}/album`;
