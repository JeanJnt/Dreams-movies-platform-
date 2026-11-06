// Affiché tout de suite pendant le chargement d'une page : la mise en page arrive, la lumière passe dessus.
export default function Loading() {
  return (
    <div className="pt-4 md:pt-14" aria-busy="true" aria-label="Chargement">
      <div className="skeleton h-3 w-40 rounded-full" />
      <div className="skeleton mt-6 h-14 w-3/4 max-w-xl rounded-xl md:h-24" />
      <div className="mt-8 flex gap-2">
        {[64, 88, 72, 96].map((w) => (
          <div key={w} className="skeleton h-9 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-12 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 md:gap-x-5 md:gap-y-8 lg:grid-cols-6 xl:grid-cols-8">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[2/3] rounded-lg" style={{ animationDelay: `${i * 40}ms` }} />
            <div className="skeleton mt-2.5 h-2.5 w-2/3 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
