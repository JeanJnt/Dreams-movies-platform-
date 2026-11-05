"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

/*
 * Onglets de navigation entre pages sœurs (bibliothèque, communauté…) :
 * une pastille glisse vers l'onglet choisi. Sur téléphone, la rangée défile au doigt.
 */
export function Tabs({ tabs, active }: { tabs: { href: string; label: string; count?: number }[]; active?: string }) {
  const path = usePathname();
  const id = useId();
  const current = active ?? tabs.find((t) => path.startsWith(t.href))?.href;
  return (
    <nav className="no-scrollbar bleed -mb-2 flex gap-1 overflow-x-auto pb-2 md:mx-0 md:px-0" aria-label="Sections">
      {tabs.map((t) => {
        const on = current === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`relative shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${on ? "text-background" : "text-muted hover:text-foreground"}`}
          >
            {on && <motion.span layoutId={`tabs-${id}`} className="absolute inset-0 rounded-full bg-foreground" transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />}
            <span className="relative">
              {t.label}
              {t.count != null && <span className="ml-1.5 font-mono text-[10px] opacity-60">{t.count}</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
