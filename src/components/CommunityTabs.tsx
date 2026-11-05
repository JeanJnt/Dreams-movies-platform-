import { Tabs } from "./ui/Tabs";

// Onglets de la partie « communauté » : le fil d'activité et la liste des membres.
export function CommunityTabs({ active }: { active: "activite" | "membres" }) {
  return (
    <Tabs
      active={`/${active}`}
      tabs={[
        { href: "/activite", label: "Activité" },
        { href: "/membres", label: "Membres" },
      ]}
    />
  );
}
