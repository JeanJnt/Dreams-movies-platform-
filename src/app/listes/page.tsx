/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { LibraryTabs } from "@/components/LibraryTabs";
import { allLists } from "@/lib/queries";
import { poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Listes" };
export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const lists = await allLists();
  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <LibraryTabs />
      <h1 className="page-title font-display text-5xl leading-[0.95] md:text-7xl">Listes</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l) => (
          <Link key={l.slug} href={`/listes/${l.slug}`} className="group rounded-xl border border-border bg-surface p-3 transition hover:border-accent/50">
            {/* Les 4 premières affiches se chevauchent, comme sur Letterboxd */}
            <div className="flex">
              {l.posters.map((p, i) => (
                <img
                  key={p}
                  src={poster(p, "w185")!}
                  alt=""
                  loading="lazy"
                  className="aspect-[2/3] w-1/4 rounded-md object-cover shadow-lg shadow-black/60 ring-1 ring-white/10"
                  style={{ marginLeft: i ? "-6%" : 0, zIndex: 4 - i }}
                />
              ))}
            </div>
            <h2 className="mt-3 font-medium group-hover:text-accent">{l.name}</h2>
            <p className="text-sm text-muted">{l.count} films</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
