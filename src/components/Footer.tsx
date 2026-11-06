import Link from "next/link";
import { BrandIcon } from "./Logo";

// Le plan du site, dans les mots de la navigation
const COLUMNS = [
  {
    title: "Films",
    links: [
      ["/films", "Journal"],
      ["/collection", "Collection"],
      ["/conseils", "Recommandations"],
      ["/watchlist", "Watchlist"],
      ["/listes", "Listes"],
      ["/critiques", "Critiques"],
      ["/preferes", "Mes 10 films"],
    ],
  },
  {
    title: "Explorer",
    links: [
      ["/recherche", "Recherche"],
      ["/personnes", "Cinéastes et acteurs"],
      ["/alertes", "À l'affiche"],
      ["/agenda", "Agenda"],
    ],
  },
  {
    title: "Amis",
    links: [
      ["/activite", "Activité"],
      ["/membres", "Amis"],
    ],
  },
  {
    title: "Compte",
    links: [
      ["/stats", "Statistiques"],
      ["/compte", "Réglages"],
      ["/installer", "Installer l'application"],
    ],
  },
] as const;

// Le pied de page : le plan du site en quatre colonnes ; le logo et le nom en signature.
export function Footer() {
  return (
    <footer className="relative mt-28 hidden border-t border-[var(--line)] md:block">
      <div className="mx-auto grid max-w-[1480px] grid-cols-[1.4fr_repeat(4,1fr)] gap-8 px-[var(--gutter)] pt-14 pb-16">
        <div>
          <BrandIcon size={56} />
          <p className="mt-5 font-display text-[2.6rem] leading-none">Dreams</p>
          <p className="wide mt-2 text-muted">Movies</p>
          <p className="mt-5 max-w-[24ch] text-[14px] text-muted">Le journal de cinéma entre amis : films vus, critiques, collection et séances.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="wide mb-4 text-muted">{c.title}</p>
            <ul className="space-y-1">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-8 items-center text-[15px] text-[var(--text-2)] transition-colors hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
