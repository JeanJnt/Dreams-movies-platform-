"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeSection } from "../Nav";

/*
 * Les onglets d'une rubrique, en tête de chacune de ses pages : on voit où l'on est (filet argent)
 * et ce qu'il y a à côté. Ils reprennent exactement les pages du menu de la rubrique.
 */
export function SectionTabs() {
  const path = usePathname();
  const section = activeSection(path);
  if (!section || section.pages.length < 2) return null;
  const current = [...section.pages].sort((a, b) => b.href.length - a.href.length).find((p) => path === p.href || path.startsWith(p.href + "/"))?.href;
  return (
    <nav aria-label={section.label} className="no-scrollbar bleed -mb-px flex overflow-x-auto border-b border-[var(--line)] md:mx-0 md:px-0">
      {section.pages.map((p) => (
        <Link key={p.href} href={p.href} aria-current={current === p.href ? "page" : undefined} className="section-tab">
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
