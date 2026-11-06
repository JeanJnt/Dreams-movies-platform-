"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

/*
 * Onglets de navigation entre pages sœurs (bibliothèque, communauté…) :
 * des cases jointives, comme les intercalaires d'un fichier de vidéoclub ; un aplat d'encre glisse vers l'onglet choisi.
 * Sur téléphone, la rangée défile au doigt.
 */
export function Tabs({ tabs, active }: { tabs: { href: string; label: string; count?: number }[]; active?: string }) {
  const path = usePathname();
  const id = useId();
  const current = active ?? tabs.find((t) => path.startsWith(t.href))?.href;
  return (
    <nav className="no-scrollbar bleed flex overflow-x-auto border-b border-[var(--dm-line)] md:mx-0 md:px-0" aria-label="Sections">
      <div className="flex shrink-0 gap-1">
        {tabs.map((t) => {
          const on = current === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-11 shrink-0 items-center px-3 text-[14px] transition-colors duration-150 ${on ? "text-foreground" : "text-muted hover:text-foreground"}`}
            >
              {on && <motion.span layoutId={`tabs-${id}`} className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent" transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }} />}
              <span className="relative">
                {t.label}
                {t.count != null && <span className="ml-1.5 text-[12px] text-muted tabular">{t.count}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
