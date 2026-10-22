/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { LibraryTabs } from "@/components/LibraryTabs";
import { Stars } from "@/components/Stars";
import { allCritiques, readingTime } from "@/lib/critiques";
import { sharedCritiques } from "@/lib/social";
import { formatLongDate } from "@/lib/format";
import { backdrop, poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Mes critiques" };
export const dynamic = "force-dynamic";

export default async function CritiquesPage() {
  const [critiques, others] = await Promise.all([allCritiques(), sharedCritiques({ excludeMine: true, limit: 30 })]);
  const [featured, ...rest] = critiques.filter((c) => c.status === "published");
  const drafts = critiques.filter((c) => c.status === "draft");

  return (
    <div className="space-y-10 pt-2 md:pt-8">
      <LibraryTabs />
      <div>
        <h1 className="page-title font-display text-5xl leading-[0.95] md:text-7xl">Mes critiques</h1>
        <p className="mt-2 text-muted">Les critiques Dreams sont écrites ici, sur la plateforme (tes reviews Letterboxd importées restent sur chaque fiche film). Pour écrire, ouvre un film et clique sur « Écrire ma critique ».</p>
      </div>

      {!critiques.length && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          Aucune critique pour l&apos;instant.{" "}
          <Link href="/films" className="text-accent hover:underline">Choisis un film →</Link>
        </div>
      )}

      {featured && (
        <Link href={`/critiques/${featured.id}`} className="group relative block overflow-hidden rounded-xl">
          {featured.backdropPath && <img src={backdrop(featured.backdropPath)!} alt="" className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-[1.02] md:aspect-[21/9]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-0 max-w-3xl p-5 md:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">{featured.filmTitleFr ?? featured.filmName} · {featured.year}</p>
            <h2 className="mt-2 text-xl md:text-2xl leading-tight md:text-5xl">{featured.title || "Sans titre"}</h2>
            {featured.lede && <p className="mt-2 line-clamp-2 text-foreground/80">{featured.lede}</p>}
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {rest.map((c) => <CritiqueCard key={c.id} c={c} href={`/critiques/${c.id}`} />)}
        </div>
      )}

      {drafts.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl md:text-2xl">Brouillons</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {drafts.map((c) => <CritiqueCard key={c.id} c={c} href={`/film/${c.filmId}/critique`} />)}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl md:text-2xl">Les critiques des membres</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {others.map((o) => (
              <Link key={o.id} href={`/critiques/${o.id}`} className="group flex gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50">
                {o.poster && <img src={poster(o.poster, "w185")!} alt="" className="aspect-[2/3] w-20 shrink-0 rounded-md object-cover" />}
                <div className="min-w-0">
                  <p className="text-xs text-muted"><span className="text-foreground">{o.author}</span> · {o.filmTitle} · {o.year}</p>
                  <h3 className="mt-1 font-display text-2xl leading-tight group-hover:text-accent">{o.title || o.filmTitle}</h3>
                  {o.lede && <p className="mt-1 line-clamp-2 text-sm text-muted">{o.lede}</p>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    {o.rating != null && <Stars rating={o.rating} />}
                    <span>{formatLongDate(o.updatedAt.slice(0, 10))} · {readingTime(o.body)} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CritiqueCard({ c, href }: { c: Awaited<ReturnType<typeof allCritiques>>[number]; href: string }) {
  return (
    <Link href={href} className="group flex gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50">
      {c.posterPath && <img src={poster(c.posterPath, "w185")!} alt="" className="aspect-[2/3] w-20 shrink-0 rounded-md object-cover" />}
      <div className="min-w-0">
        <p className="text-xs text-muted">{c.filmTitleFr ?? c.filmName} · {c.year}</p>
        <h3 className="mt-1 font-display text-2xl leading-tight group-hover:text-accent">{c.title || "Sans titre"}</h3>
        {c.lede && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.lede}</p>}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          {c.rating != null && <Stars rating={c.rating} />}
          <span>{formatLongDate(c.updatedAt.slice(0, 10))} · {readingTime(c.body)} min</span>
        </div>
      </div>
    </Link>
  );
}
