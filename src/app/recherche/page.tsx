/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { searchAll } from "@/lib/search";
import { poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Rechercher" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const { films, people } = await searchAll(q, { films: 24, people: 6 });

  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <h1 className="page-title font-display text-5xl leading-[0.95] md:text-7xl">Rechercher</h1>
      <SearchBox defaultValue={q} />

      {q && !films.length && !people.length && <p className="text-muted">Aucun résultat pour « {q} ».</p>}

      {people.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {people.map((p) => (
            <Link key={p.id} href={`/personne/${p.id}`} className="flex shrink-0 items-center gap-3 rounded-full border border-border bg-surface py-1.5 pr-4 pl-1.5 hover:border-accent/50">
              <span className="size-10 overflow-hidden rounded-full bg-surface-2">
                {p.photo && <img src={poster(p.photo, "w185")!} alt="" className="size-full object-cover" />}
              </span>
              <span>
                <span className="block text-sm">{p.name}</span>
                {p.job && <span className="block text-xs text-muted">{p.job}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {films.map((r) => (
          <Link key={r.key} href={r.href} className="group flex gap-4 rounded-xl border border-border bg-surface p-3 hover:border-accent/50">
            <div className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded bg-surface-2">
              {r.poster && <img src={poster(r.poster, "w185")!} alt="" loading="lazy" className="size-full object-cover" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-medium group-hover:text-accent">
                {r.title} <span className="text-muted">{r.year}</span>
              </h2>
              {r.sub && <p className="text-xs text-muted">{r.sub}</p>}
              <p className="mt-1 line-clamp-2 text-xs text-muted">{r.overview}</p>
              {r.seen && <span className="mt-1 inline-block text-xs text-accent">✓ vu</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
