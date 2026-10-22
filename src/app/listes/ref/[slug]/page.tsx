import { notFound } from "next/navigation";
import { FilmCard } from "@/components/FilmCard";
import { LibraryTabs } from "@/components/LibraryTabs";
import { refListDetail } from "@/lib/ref-lists";

export const dynamic = "force-dynamic";

// Une liste de référence, avec ma progression : les films pas encore vus sont estompés.
export default async function RefListPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ vus?: string }> }) {
  const { slug } = await params;
  const { vus } = await searchParams;
  const list = await refListDetail(slug);
  if (!list) notFound();
  const seen = list.films.filter((f) => f.seen).length;
  const pct = list.films.length ? Math.round((seen / list.films.length) * 100) : 0;
  const films = vus === "non" ? list.films.filter((f) => !f.seen) : list.films;

  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <LibraryTabs />
      <div>
        <h1 className="page-title text-5xl leading-[0.95] md:text-6xl">{list.name}</h1>
        {list.description && <p className="mt-3 max-w-2xl text-muted">{list.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <span>{seen} / {list.films.length} vus ({pct} %)</span>
          <a href={vus === "non" ? "?" : "?vus=non"} className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent">
            {vus === "non" ? "Voir tous les films" : "Seulement ceux à voir"}
          </a>
          {list.sourceUrl && <a href={list.sourceUrl} target="_blank" rel="noreferrer" className="text-xs hover:text-accent">Source</a>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {films.map((f) => (
          <div key={f.id} className="relative">
            <span className="font-display absolute top-1 left-1 z-10 rounded bg-black/70 px-1.5 text-xs text-white tabular-nums">{f.rank}</span>
            <FilmCard film={f} dim={!f.seen} />
          </div>
        ))}
      </div>
    </div>
  );
}
