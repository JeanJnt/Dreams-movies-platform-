import type { Metadata } from "next";
import { Suspense } from "react";
import { PickCard } from "@/components/PickCard";
import { PickFilters, PlatformPicker } from "@/components/PickControls";
import { PageHeader } from "@/components/ui/PageHeader";
import { GENRES, PLATFORMS, getMyPlatforms, picks, type PickFilters as Filters } from "@/lib/reco";

export const metadata: Metadata = { title: "Conseils" };
export const dynamic = "force-dynamic";

export default async function ConseilsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  if (filters.from && !filters.mode) filters.mode = "similaire";
  const [result, mine] = await Promise.all([picks(filters), getMyPlatforms()]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={filters.mode === "watchlist" ? "Découvrir · ta watchlist" : result.fromTitle ? "Découvrir · dans le même esprit" : "Découvrir · pour toi"}
        title="Que regarder ce soir ?"
        lede={<>
          {filters.mode === "watchlist"
            ? "Les films de ta watchlist, du plus au moins susceptible de te plaire."
            : result.fromTitle
              ? <>Des films dans l&apos;esprit de <span className="text-foreground">{result.fromTitle}</span>.</>
              : "Choisis à partir des films que tu as le mieux notés et de tes coups de cœur."}
        </>}
      />

      <PlatformPicker all={PLATFORMS.map(({ key, name }) => ({ key, name }))} mine={mine} />
      <Suspense>
        <PickFilters genres={GENRES} />
      </Suspense>

      {result.empty === "reco" ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Les recommandations ne sont pas encore calculées. Lance <code className="text-accent">npm run reco</code> dans le terminal.
        </div>
      ) : result.picks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          <p className="font-display text-2xl text-foreground">Rien ce soir…</p>
          <p className="mt-2">Élargis les filtres ou désactive « Seulement sur mes plateformes ».</p>
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
