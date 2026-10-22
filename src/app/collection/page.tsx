import type { Metadata } from "next";
import Link from "next/link";
import { DiscCarousel, type Disc } from "@/components/DiscCarousel";
import { DvdCase, Shelf, type CaseFilm } from "@/components/DvdCase";
import { LibraryTabs } from "@/components/LibraryTabs";
import { FORMATS, ownedCounts, ownedFilms } from "@/lib/collection";
import { backdrop, poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Ma collection" };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "boitiers", label: "Boîtiers" },
  { key: "etagere", label: "Étagère" },
  { key: "disques", label: "Disques" },
] as const;

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ format?: string; vue?: string }> }) {
  const { format, vue = "boitiers" } = await searchParams;
  const [owned, counts] = await Promise.all([ownedFilms(format), ownedCounts()]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const unseen = owned.filter((f) => !f.seen).length;

  const films: CaseFilm[] = owned.map((f) => ({
    id: f.id,
    href: `/film/${f.id}`,
    title: f.title_fr ?? f.name,
    year: f.year,
    director: f.director,
    runtime: f.runtime,
    cover: f.cover || poster(f.poster_path, "w500"), // ma vraie jaquette si je l'ai ajoutée
    caseType: f.caseType,
    image: backdrop(f.backdrop_path),
    format: f.format,
    seen: f.seen,
  }));
  const discs: Disc[] = films.map((f) => ({ ...f, image: f.image ?? f.cover, badge: f.format }));

  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ format, vue, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return q ? `/collection?${q}` : "/collection";
  };

  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <LibraryTabs />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Ma collection</h1>
          {total > 0 && <p className="mt-3 text-sm text-muted">{total} films{unseen ? ` · ${unseen} pas encore vus` : ""}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Link href="/collection/ajouter" className="rounded-full bg-accent px-4 py-1.5 text-sm text-on-accent">Ajouter des films</Link>
        <Link href="/collection/scanner" className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent">Scanner</Link>
        <div className={`flex rounded-full border border-border bg-surface p-0.5 text-xs ${total ? "" : "hidden"}`}>
          {VIEWS.map((v) => (
            <Link key={v.key} href={link({ vue: v.key })} className={`rounded-full px-3.5 py-1.5 ${vue === v.key ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
              {v.label}
            </Link>
          ))}
        </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <h2 className="text-2xl">Ta collection est vide</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">DVD, Blu-ray, éditions collector.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/collection/ajouter" className="rounded-full bg-accent px-6 py-3 text-on-accent">Commencer ma collection</Link>
            <Link href="/collection/scanner" className="rounded-full border border-border px-6 py-3 hover:border-accent">Scanner un boîtier</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <FormatChip href={link({ format: undefined })} active={!format} label={`Tout (${total})`} />
          {FORMATS.filter((f) => counts[f]).map((f) => (
            <FormatChip key={f} href={link({ format: f })} active={format === f} label={`${f} (${counts[f]})`} />
          ))}
        </div>
      )}

      {total === 0 ? null : vue === "etagere" ? (
        <Shelf films={films} />
      ) : vue === "disques" ? (
        <DiscCarousel key={format ?? "all"} discs={discs} label="Ma collection en disques" />
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 pt-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {films.map((f) => <DvdCase key={f.id} film={f} />)}
        </div>
      )}
    </div>
  );
}

function FormatChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`rounded-full border px-3 py-1 text-xs ${active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"}`}>
      {label}
    </Link>
  );
}
