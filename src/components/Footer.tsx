import Link from "next/link";
import { BrushYume } from "./Logo";

const COLUMNS = [
  {
    title: "Journal",
    links: [
      ["/films", "Films vus"],
      ["/watchlist", "Watchlist"],
      ["/critiques", "Critiques"],
      ["/listes", "Listes"],
      ["/preferes", "Préférés"],
    ],
  },
  {
    title: "Découvrir",
    links: [
      ["/conseils", "Que regarder"],
      ["/alertes", "Au cinéma"],
      ["/personnes", "Cinéastes & acteurs"],
      ["/recherche", "Recherche"],
    ],
  },
  {
    title: "Chez moi",
    links: [
      ["/collection", "Collection"],
      ["/agenda", "Agenda"],
      ["/stats", "Statistiques"],
      ["/compte", "Mon compte"],
    ],
  },
  {
    title: "La bande",
    links: [
      ["/activite", "Activité"],
      ["/membres", "Membres"],
      ["/installer", "Installer l'appli"],
    ],
  },
] as const;

// Le pied de page, comme un générique de fin : tout le site d'un coup d'œil (ordinateur seulement).
export function Footer() {
  return (
    <footer className="relative mt-8 hidden border-t border-[var(--line)] md:block">
      <div className="mx-auto grid max-w-[88rem] grid-cols-[1.3fr_repeat(4,1fr)] gap-10 px-10 pt-16 pb-12">
        <div>
          <BrushYume className="h-14 w-auto text-accent" />
          <p className="mt-5 font-display text-3xl leading-none">Dreams</p>
          <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted">Le journal de cinéma de la bande : ce qu&apos;on a vu, aimé, écrit et rangé sur l&apos;étagère.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="eyebrow mb-5">{c.title}</p>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="link-draw text-foreground/75 hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-[88rem] items-center justify-between border-t border-[var(--line)] px-10 py-6">
        <p className="eyebrow">夢 · d&apos;après Les Rêves d&apos;Akira Kurosawa, 1990</p>
        <p className="eyebrow">
          <kbd className="font-mono">⌘K</kbd> pour tout trouver
        </p>
      </div>
    </footer>
  );
}
