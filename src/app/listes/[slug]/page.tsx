import { notFound } from "next/navigation";
import { FilmGrid } from "@/components/FilmCard";
import { listDetail } from "@/lib/queries";

export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await listDetail(slug);
  if (!list) notFound();
  const seen = list.films.filter((f) => f.seen).length;
  const pct = list.films.length ? Math.round((seen / list.films.length) * 100) : 0;

  return (
    <div className="space-y-8 pt-4 md:pt-14">
      <div>
        <h1 className="page-title font-display text-[clamp(2.9rem,8.5vw,6.75rem)] leading-[0.92] text-balance">{list.name}</h1>
        {list.description && <p className="mt-2 max-w-2xl text-muted">{list.description}</p>}
        <div className="mt-4 flex items-center gap-3 text-sm text-muted">
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          {seen} / {list.films.length} vus ({pct} %)
        </div>
      </div>
      <FilmGrid films={list.films} dim />
    </div>
  );
}
