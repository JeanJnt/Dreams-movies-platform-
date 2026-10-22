import type { Metadata } from "next";
import Link from "next/link";
import { CommunityTabs } from "@/components/CommunityTabs";
import { requireUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/format";
import { members } from "@/lib/social";

export const metadata: Metadata = { title: "Membres" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const me = await requireUser();
  const list = await members();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2 md:pt-8">
      <CommunityTabs active="membres" />
      <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Membres</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((m) => (
          <Link key={m.id} href={`/membre/${m.id}`} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-accent/60">
            <span className="font-display flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-2xl text-on-accent">{m.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="font-display block truncate text-xl">{m.name}{m.id === me.id && <span className="ml-1 text-sm text-muted">(toi)</span>}</span>
              <span className="block text-xs text-muted">{m.films.toLocaleString("fr-FR")} films · {m.critiques} critiques Dreams</span>
              <span className="block text-xs text-muted">{m.lastActivity ? `Dernier film le ${formatLongDate(m.lastActivity.slice(0, 10))}` : `Membre depuis le ${formatLongDate(m.createdAt.slice(0, 10))}`}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
