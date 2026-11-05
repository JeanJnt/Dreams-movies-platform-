import { Tabs } from "./ui/Tabs";

const TABS = [
  { href: "/films", label: "Vus" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/collection", label: "Collection" },
  { href: "/listes", label: "Listes" },
  { href: "/critiques", label: "Critiques" },
  { href: "/personnes", label: "Cinéastes & acteurs" },
];

// Sous-onglets de la bibliothèque : tous mes films, rangés de différentes façons.
export function LibraryTabs() {
  return <Tabs tabs={TABS} />;
}
