"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const path = usePathname();
  return (
    <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
            path.startsWith(t.href) ? "bg-foreground text-background" : "bg-surface text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
