/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { searchAll } from "@/lib/search";
import { poster } from "@/lib/tmdb";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Rechercher" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const { films, people } = await searchAll(q, { films: 24, people: 6 });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Films, séries et personnes, dans toutes les langues" title="Rechercher" />
      <SearchBox defaultValue={q} />

      {q && !films.length && !people.length && <p className="text-muted">Aucun résultat pour « {q} ».</p>}

      {people.length > 0 && (
        <div className="no-scrollbar bleed flex gap-2 overflow-x-auto pb-1">
          {people.map((p) => (
            <Link key={p.id} href={`/personne/${p.id}`} className="ticket shrink-0 !min-h-0 !gap-3 !py-1.5 !pr-5 !pl-1.5">
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

      {films.length > 0 && (
        <ul className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5 md:gap-x-6 lg:grid-cols-6">
          {films.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="group block">
                <div className="poster aspect-[2/3]">
                  {r.poster ? (
                    <img src={poster(r.poster, "w342")!} alt="" loading="lazy" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center p-3 text-center font-display text-lg leading-tight">{r.title}</span>
                  )}
                  {r.seen && <span className="sticker absolute top-2 left-2">Vu</span>}
                </div>
                <h2 className="mt-3 line-clamp-2 text-[14.5px] leading-snug font-medium">{r.title}</h2>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{[r.year, r.sub].filter(Boolean).join(" · ")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
