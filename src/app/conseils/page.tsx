import type { Metadata } from "next";
import { Suspense } from "react";
import { PickCard } from "@/components/PickCard";
import { PickFilters, PlatformPicker } from "@/components/PickControls";
import { PageHeader } from "@/components/ui/PageHeader";
import { GENRES, PLATFORMS, getMyPlatforms, picks, type PickFilters as Filters } from "@/lib/reco";

export const metadata: Metadata = { title: "Recommandations" };
export const dynamic = "force-dynamic";

export default async function ConseilsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  if (filters.from && !filters.mode) filters.mode = "similaire";
  const [result, mine] = await Promise.all([picks(filters), getMyPlatforms()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={filters.mode === "watchlist" ? "Votre watchlist" : result.fromTitle ? "Dans le même esprit" : "Pour vous"}
        title="Que regarder ce soir ?"
        lede={<>
          {filters.mode === "watchlist"
            ? "Les films de votre watchlist, du plus au moins susceptible de vous plaire."
            : result.fromTitle
              ? <>Des films dans l&apos;esprit de <span className="text-foreground">{result.fromTitle}</span>.</>
              : "Sélectionnés d'après les films que vous avez le mieux notés et vos coups de cœur."}
        </>}
      />

      <PlatformPicker all={PLATFORMS.map(({ key, name }) => ({ key, name }))} mine={mine} />
      <Suspense>
        <PickFilters genres={GENRES} />
      </Suspense>

      {result.empty === "reco" ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Vos recommandations sont en préparation. Revenez dans quelques minutes.
        </div>
      ) : result.picks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          <p className="font-display text-2xl text-foreground">Aucun film ne correspond</p>
          <p className="mt-2">Élargissez les filtres ou désactivez « Seulement sur mes plateformes ».</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            <span className="font-display text-2xl text-foreground tabular">{result.picks.length}</span> films
            {result.picks.length > 60 && " · les 60 meilleurs"}
          </p>
          <div className="reveal-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.picks.slice(0, 60).map((p) => <PickCard key={p.key} pick={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
