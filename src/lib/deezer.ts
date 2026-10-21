// Bande originale d'un film sur Deezer (API publique, sans clé).

export type Soundtrack = { id: number; title: string; artist: string; cover: string; link: string; tracks: number };

type Album = {
  id: number;
  title: string;
  link: string;
  cover_medium: string;
  nb_tracks: number;
  artist: { name: string };
};

// Minuscules, sans accents ni ponctuation (en gardant les lettres non latines : 花樣年華, 乱…).
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const SOUNDTRACK = /(original motion picture soundtrack|motion picture soundtrack|original soundtrack|original score|soundtrack|bande originale du film|bande originale|musique du film|music from|o\.?s\.?t\.?|score)/i;
const NOT_THE_FILM = /(extrait|inspired by|tribute|hommage|karaoke|best of|themes|\d+ movie|collection|greatest)/i;

// Le titre de l'album sans « (Original Motion Picture Soundtrack) », « - Bande originale », « Soundtrack »…
function coreTitle(album: string) {
  const noBrackets = album.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
  const cut = noBrackets.search(SOUNDTRACK);
  return normalize(cut >= 0 ? noBrackets.slice(0, cut) : noBrackets);
}

export async function findSoundtrack(titles: (string | null | undefined)[]): Promise<Soundtrack | null> {
  const unique = [...new Set(titles.filter(Boolean) as string[])];
  const cache = { next: { revalidate: 60 * 60 * 24 * 7 } }; // une recherche par film et par semaine

  for (const title of unique) {
    const t = normalize(title);
    if (!t) continue;
    for (const q of [`${title} soundtrack`, `${title} original`, title]) {
      try {
        const res = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=25`, cache);
        if (!res.ok) continue;
        const albums: Album[] = (await res.json()).data ?? [];
        // Le titre de l'album, une fois nettoyé, doit être exactement celui du film, et ressembler à une BO.
        const match = albums.find((a) => SOUNDTRACK.test(a.title) && !NOT_THE_FILM.test(a.title) && coreTitle(a.title) === t);
        if (match) {
          return { id: match.id, title: match.title, artist: match.artist.name, cover: match.cover_medium, link: match.link, tracks: match.nb_tracks };
        }
      } catch {
        // Deezer injoignable : on n'affiche simplement pas la section.
      }
    }
  }
  return null;
}
