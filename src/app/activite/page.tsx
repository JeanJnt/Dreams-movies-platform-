import type { Metadata } from "next";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CommunityTabs } from "@/components/CommunityTabs";
import { activity } from "@/lib/social";

export const metadata: Metadata = { title: "Activité" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const items = await activity({ limit: 60 });
  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2 md:pt-8">
      <CommunityTabs active="activite" />
      <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Activité</h1>
      <p className="text-muted">Ce que les membres regardent, notent, critiquent et collectionnent.</p>
      <ActivityFeed items={items} />
    </div>
  );
}
