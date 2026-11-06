import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { DiscCarousel, type Disc } from "@/components/DiscCarousel";
import { DvdCase, Shelf, type CaseFilm } from "@/components/DvdCase";
import { LibraryTabs } from "@/components/LibraryTabs";
import { FORMATS, ownedCounts, ownedFilms } from "@/lib/collection";
import { discStyles } from "@/lib/disc-style";
import { backdrop, poster } from "@/lib/tmdb";
import { Parade } from "@/components/collection/Parade";
import type { ParadeRow } from "@/components/three/dreams/CaseParade";
import { EDITIONS, editionFor } from "@/components/three/cases/editions";
import { caseFilms } from "@/lib/case-films";

export const metadata: Metadata = { title: "Ma collection" };
export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "defile", label: "Défilé" },
  { key: "boitiers", label: "Boîtiers" },
  { key: "etagere", label: "Étagère" },
  { key: "disques", label: "Disques" },
] as const;

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ format?: string; vue?: string }> }) {
  const { format, vue = "defile" } = await searchParams;
  const [owned, counts] = await Promise.all([ownedFilms(format), ownedCounts()]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const unseen = owned.filter((f) => !f.seen).length;

  const raw: CaseFilm[] = owned.map((f) => ({
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
  // Couleur de l'image et maquette choisie, pour l'étiquette de chaque disque
  const styles = await discStyles(raw.map((f) => ({ id: f.id, image: f.image ?? f.cover })));
  const films: CaseFilm[] = raw.map((f) => ({ ...f, ...styles.get(f.id) }));
  const discs: Disc[] = films.map((f) => ({ ...f, image: f.image ?? f.cover, badge: f.format }));
  // Le défilé 3D : chaque exemplaire dans son boîtier, à l'épaisseur de son édition
  let shelf: ParadeRow[] = [];
  if (vue === "defile" && owned.length) {
    const cfs = new Map((await caseFilms(owned.map((o) => o.id), "/film")).map((c) => [c.id, c]));
    shelf = owned.flatMap((o) => {
      const film = cfs.get(o.id);
      if (!film) return [];
      const edition = editionFor(o);
      return [{ film: { ...film, edition: o.edition, caseType: o.caseType }, label: EDITIONS[edition].label, editionName: o.edition, director: o.director }];
    });
  }

  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ format, vue, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return q ? `/collection?${q}` : "/collection";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={total > 0 ? `${total} éditions physiques` : "DVD, Blu-ray, 4K"}
        number={total > 0 && unseen ? `${unseen} pas encore vus` : undefined}
        title="Ma collection"
        actions={
          <>
            <Link href="/collection/ajouter" className="btn btn-primary">Ajouter des films</Link>
            <Link href="/collection/scanner" className="btn">Scanner un code-barres</Link>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LibraryTabs />
          <div className={`dm-seg ${total ? "" : "hidden"}`} role="group" aria-label="Affichage">
            {VIEWS.map((v) => (
              <Link key={v.key} href={link({ vue: v.key })} aria-current={vue === v.key ? "page" : undefined} className={`flex min-h-[34px] items-center rounded-full px-3.5 text-[13px] font-medium transition-colors ${vue === v.key ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}>
                {v.label}
              </Link>
            ))}
          </div>
        </div>
      </PageHeader>

      {total === 0 ? (
        <div className="card px-6 py-16 text-center">
          <h2 className="text-4xl">Votre collection est vide</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">Ajoutez vos DVD, Blu-ray et éditions collector : scannez le code-barres ou cherchez le film.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/collection/ajouter" className="btn btn-primary">Ajouter un premier film</Link>
            <Link href="/collection/scanner" className="btn">Scanner un code-barres</Link>
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

      {total === 0 ? null : vue === "defile" ? (
        <Parade rows={shelf} />
      ) : vue === "etagere" ? (
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
    <Link href={href} aria-pressed={active} className="dm-chip">
      {label}
    </Link>
  );
}
