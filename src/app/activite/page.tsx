import type { Metadata } from "next";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CommunityTabs } from "@/components/CommunityTabs";
import { activity } from "@/lib/social";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Activité" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const items = await activity({ limit: 60 });
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Communauté" title="Activité" lede="Ce que vos amis regardent, notent, critiquent et collectionnent.">
        <CommunityTabs active="activite" />
      </PageHeader>
      <ActivityFeed items={items} />
    </div>
  );
}
