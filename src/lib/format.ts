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

// Un nombre décimal à la française : 4,1 (et non 4.1)
export const frNum = (n: number, digits = 1) => n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
// Une note lue par un lecteur d'écran : « 4,5 étoiles sur 5 », « 1 étoile sur 5 »
export const starsLabel = (n: number) => `${n.toLocaleString("fr-FR")} étoile${n >= 2 ? "s" : ""} sur 5`;

// Le métier d'une personne (département TMDB), accordé quand TMDB connaît son genre (1 : femme, 2 : homme)
export function jobLabel(dept: string | null | undefined, gender?: number | null) {
  const f = gender === 1, m = gender === 2;
  const pick = (fem: string, masc: string, neutral: string) => (f ? fem : m ? masc : neutral);
  switch (dept) {
    case "Directing": return pick("Réalisatrice", "Réalisateur", "Réalisation");
    case "Acting": return pick("Actrice", "Acteur", "Interprétation");
    case "Writing": return "Scénario";
    case "Camera": return "Image";
    case "Sound": return "Musique et son";
    case "Editing": return "Montage";
    case "Production": return "Production";
    case "Art": return "Décors";
    case "Costume & Make-Up": return "Costumes et maquillage";
    case "Visual Effects": return "Effets visuels";
    case "Lighting": return "Lumière";
    case "Crew": return "Équipe technique";
    default: return null;
  }
}

// Les pays viennent de TMDB en anglais : on les affiche en français (noms normalisés CLDR, plus quelques cas propres à TMDB)
const COUNTRY_EXTRA: Record<string, string> = {
  "United States of America": "États-Unis",
  "Soviet Union": "URSS",
  "Czechoslovakia": "Tchécoslovaquie",
  "Yugoslavia": "Yougoslavie",
  "East Germany": "Allemagne de l'Est",
  "West Germany": "Allemagne de l'Ouest",
  "Serbia and Montenegro": "Serbie-et-Monténégro",
  "Hong Kong": "Hong Kong",
  "South Korea": "Corée du Sud",
  "North Korea": "Corée du Nord",
  "Russia": "Russie",
  "Iran": "Iran",
  "Taiwan": "Taïwan",
  "Palestinian Territory": "Palestine",
  "Macedonia": "Macédoine du Nord",
  "Czech Republic": "Tchéquie",
};
let countryMap: Map<string, string> | null = null;
export function countryFr(name: string) {
  if (COUNTRY_EXTRA[name]) return COUNTRY_EXTRA[name];
  if (!countryMap) {
    countryMap = new Map();
    try {
      const en = new Intl.DisplayNames(["en"], { type: "region" }), fr = new Intl.DisplayNames(["fr"], { type: "region" });
      const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (const a of A)
        for (const b of A) {
          const code = a + b;
          const e = en.of(code);
          if (e && e !== code) countryMap.set(e, fr.of(code) ?? e);
        }
    } catch {
      /* sans Intl.DisplayNames : on garde le nom d'origine */
    }
  }
  return countryMap.get(name) ?? name;
}
