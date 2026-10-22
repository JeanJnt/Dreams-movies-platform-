/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { uid } from "@/lib/auth";
import { db } from "@/lib/db";
import { poster, tmdb } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Rechercher" };
export const dynamic = "force-dynamic";

type Result = { id: number; title: string; original_title: string; release_date?: string; poster_path: string | null; overview: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  let results: (Result & { localId?: number; seen?: boolean })[] = [];

  if (q) {
    const res = await tmdb<{ results: Result[] }>("/search/movie", { query: q });
    results = res.results.slice(0, 20);
    // Les films déjà dans Dreams ouvrent directement leur fiche.
    if (results.length) {
      const { rows } = await db().execute({
        sql: `SELECT f.id, f.tmdb_id, (w.film_id IS NOT NULL) AS seen FROM films f LEFT JOIN watched w ON w.film_id = f.id AND w.user_id = ${await uid()}
              WHERE f.tmdb_id IN (${results.map(() => "?").join(",")})`,
        args: results.map((r) => r.id),
      });
      const local = new Map(rows.map((r) => [Number(r.tmdb_id), { id: Number(r.id), seen: Boolean(r.seen) }]));
      results = results.map((r) => ({ ...r, localId: local.get(r.id)?.id, seen: local.get(r.id)?.seen }));
    }
  }

  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <h1 className="page-title font-display text-5xl leading-[0.95] md:text-7xl">Rechercher</h1>
      <form action="/recherche">
        <input
          name="q"
          type="search"
          defaultValue={q}
          autoFocus
          placeholder="N'importe quel film : Close-Up, Ran, Cléo de 5 à 7…"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg outline-none focus:border-accent"
        />
      </form>

      {q && !results.length && <p className="text-muted">Aucun résultat pour « {q} ».</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((r) => (
          <Link key={r.id} href={r.localId ? `/film/${r.localId}` : `/tmdb/${r.id}`} className="group flex gap-4 rounded-xl border border-border bg-surface p-3 hover:border-accent/50">
            <div className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded bg-surface-2">
              {r.poster_path && <img src={poster(r.poster_path, "w185")!} alt="" loading="lazy" className="size-full object-cover" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-medium group-hover:text-accent">
                {r.title} <span className="text-muted">{r.release_date?.slice(0, 4)}</span>
              </h2>
              {r.original_title !== r.title && <p className="text-xs text-muted italic">{r.original_title}</p>}
              <p className="mt-1 line-clamp-2 text-xs text-muted">{r.overview}</p>
              {r.seen && <span className="mt-1 inline-block text-xs text-accent">✓ vu</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
