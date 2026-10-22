// Affiché tout de suite pendant le chargement d'une page : on voit que le toucher a été pris en compte.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 pt-2 md:pt-8" aria-busy="true" aria-label="Chargement">
      <div className="h-12 w-2/3 max-w-md rounded-lg bg-surface-2/70 md:h-16" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="aspect-[2/3] rounded-md bg-surface-2/60" />
        ))}
      </div>
    </div>
  );
}
