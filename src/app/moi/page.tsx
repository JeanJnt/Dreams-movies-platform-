import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { overview } from "@/lib/queries";
import { ThemeChoice } from "@/components/ThemeChoice";

export const metadata: Metadata = { title: "Moi" };

/*
 * « Moi » (onglet du téléphone) : tout ce qui est personnel, en un écran.
 * Sur ordinateur, ces pages sont dans le menu du compte et dans la navigation.
 */
export default async function MePage() {
  const user = await requireUser();
  const o = await overview();
  const groups = [
    {
      title: "Mes films",
      links: [
        { href: `/membre/${user.id}`, label: "Mon profil", hint: "Ce que voient les membres" },
        { href: "/watchlist", label: "Watchlist", hint: `${o.watchlist.toLocaleString("fr-FR")} films à voir` },
        { href: "/stats", label: "Statistiques", hint: `${o.watched.toLocaleString("fr-FR")} films, ${o.hours.toLocaleString("fr-FR")} heures` },
        { href: "/preferes", label: "Mes 10 films", hint: "Le classement de mon profil" },
      ],
    },
    {
      title: "Amis",
      links: [
        { href: "/activite", label: "Activité", hint: "Ce que les membres regardent" },
        { href: "/membres", label: "Membres", hint: "Les profils" },
        { href: "/agenda", label: "Agenda", hint: "Les séances prévues" },
      ],
    },
    {
      title: "Réglages",
      links: [
        { href: "/compte", label: "Compte et import", hint: "Letterboxd, ville, notifications" },
        { href: "/alertes", label: "Au cinéma", hint: "Mes alertes de sortie" },
        { href: "/installer", label: "Installer l'appli", hint: "Sur l'écran d'accueil du téléphone" },
        ...(user.isAdmin ? [{ href: "/admin", label: "Administration", hint: "Invitations, membres" }] : []),
      ],
    },
  ];
  const name = user.username ?? user.name;
  return (
    <div className="pt-8">
      <div className="flex items-center gap-4">
        <span className="avatar size-16 text-3xl">{name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 data-split className="truncate text-[2.6rem] leading-none">
            {name}
          </h1>
          <p className="mt-1 text-[14px] text-muted">{o.watched.toLocaleString("fr-FR")} films vus</p>
        </div>
      </div>
      <div className="mt-8">
        <p className="wide mb-3 text-muted">Thème</p>
        <ThemeChoice />
      </div>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.title} aria-labelledby={`g-${g.title}`}>
            <h2 id={`g-${g.title}`} className="wide mb-3 text-muted">
              {g.title}
            </h2>
            <ul className="card divide-y divide-[var(--line)] overflow-hidden !p-0">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 transition-colors active:bg-white/[0.04]">
                    <span>
                      <span className="block text-[16px]">{l.label}</span>
                      <span className="block text-[13px] text-muted">{l.hint}</span>
                    </span>
                    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
