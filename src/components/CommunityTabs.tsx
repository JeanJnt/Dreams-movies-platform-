import Link from "next/link";

// Onglets de la partie « communauté » : le fil d'activité et la liste des membres.
export function CommunityTabs({ active }: { active: "activite" | "membres" }) {
  return (
    <div className="flex gap-1">
      {[
        { href: "/activite", key: "activite", label: "Activité" },
        { href: "/membres", key: "membres", label: "Membres" },
      ].map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-full px-4 py-1.5 text-sm transition ${active === t.key ? "bg-foreground text-background" : "bg-surface text-muted hover:text-foreground"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
