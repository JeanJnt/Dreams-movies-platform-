/*
 * Les années de cinéma en piles de disques : une pile par année, un disque pour dix films.
 * Les disques sont vus de trois quarts (ellipses), avec le reflet irisé de la face gravée ;
 * la pile la plus haute est l'année la plus riche. Le chiffre exact est écrit au-dessus de chaque pile.
 */
export function DiscStacks({ data }: { data: { year: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const per = max > 400 ? 20 : 10;
  return (
    <figure>
      <div className="no-scrollbar bleed overflow-x-auto">
        <ol className="flex min-w-max items-end gap-3 pt-10 md:gap-5" aria-label={`Films vus par année, un disque pour ${per} films`}>
          {data.map((d) => {
            const discs = Math.max(1, Math.round(d.count / per));
            return (
              <li key={d.year} className="group flex w-[4.6rem] flex-col items-center md:w-[5.4rem]">
                <span className="mb-2 font-display text-[1.35rem] leading-none tabular transition-colors group-hover:text-white">{d.count}</span>
                <span className="disc-stack" style={{ "--n": discs } as React.CSSProperties} aria-hidden>
                  {Array.from({ length: discs }, (_, i) => (
                    <span key={i} className="disc-stack__disc" style={{ "--i": i } as React.CSSProperties} />
                  ))}
                </span>
                <span className="mt-3 text-[13px] text-muted tabular">{d.year}</span>
                <span className="sr-only">
                  {d.year} : {d.count} films
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <figcaption className="mt-5 text-[13.5px] text-muted">Un disque pour {per} films vus. Survolez une pile pour la mettre en lumière.</figcaption>
    </figure>
  );
}
