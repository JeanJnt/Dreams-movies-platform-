const parse = (iso: string) => new Date(`${iso}T12:00:00`);

export const formatShortDate = (iso: string | null) =>
  iso ? parse(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

export const formatLongDate = (iso: string | null) =>
  iso ? parse(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

export const formatRuntime = (minutes: number | null) =>
  minutes ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}` : null;

// Lien vers la fiche Letterboxd d'un film : le lien court de l'export, sinon la redirection officielle par identifiant TMDB,
// sinon une recherche par titre.
export function letterboxdUrl(film: { lb_uri?: string | null; tmdb_id?: number | null; name: string }) {
  if (film.lb_uri) return film.lb_uri;
  if (film.tmdb_id) return `https://letterboxd.com/tmdb/${film.tmdb_id}/`;
  return `https://letterboxd.com/search/films/${encodeURIComponent(film.name)}/`;
}

// Où voir les séances d'un film dans la ville du membre (pas d'API publique des horaires : on ouvre les bons sites).
// À Paris, Paris Ciné Info s'ouvre directement filtré sur le film (?search=…) avec toutes ses séances.
export function showtimeLinks(title: string, city: string, country: string) {
  const isParis = /^paris$/i.test(city.trim());
  const google = { label: `Séances à ${city}`, href: `https://www.google.com/search?q=${encodeURIComponent(`séances ${title} ${city}`)}`, main: !isParis };
  const pci = { label: "Paris Ciné Info", href: `https://www.paris-cine.info/?search=${encodeURIComponent(title)}`, main: true };
  const allocine = { label: "Allociné", href: `https://www.allocine.fr/rechercher/?q=${encodeURIComponent(title)}`, main: false };
  return [...(isParis ? [pci, { ...google, label: "Google" }] : [google]), ...(country === "FR" ? [allocine] : [])];
}
