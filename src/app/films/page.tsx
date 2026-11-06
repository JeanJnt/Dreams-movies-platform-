/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilmGrid } from "@/components/FilmCard";
import { FilterBar } from "@/components/FilterBar";
import { Stars } from "@/components/Stars";
import { PageHeader } from "@/components/ui/PageHeader";
import { allGenres, recentDiary, watchedFilms, type DiaryEntry, type FilmFilters } from "@/lib/queries";
import { poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Journal" };

type Params = FilmFilters & { vue?: string };
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/*
 * Le journal : deux façons de parcourir ses films.
 *   « Journal » (par défaut) : les séances dans l'ordre, mois par mois — date, film, note, revisionnage ;
 *   « Affiches » : tous les films vus, en grille, avec recherche, tri et filtres.
 */
export default async function FilmsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { vue = "journal", ...filters } = await searchParams;
  const diaryView = vue !== "affiches";
  const [films, genres, diary] = await Promise.all([diaryView ? null : watchedFilms(filters), diaryView ? [] : allGenres(), diaryView ? recentDiary(500) : null]);

  // regroupe les séances par mois
  const months: { key: string; label: string; items: DiaryEntry[] }[] = [];
  for (const d of diary ?? []) {
    const [y, m] = d.watched_date.split("-");
    const key = `${y}-${m}`;
    let g = months.at(-1);
    if (!g || g.key !== key) months.push((g = { key, label: `${MONTHS[Number(m) - 1]} ${y}`, items: [] }));
    g.items.push(d);
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Journal"
        number={diaryView ? `${(diary ?? []).length.toLocaleString("fr-FR")} dernières séances` : `${(films ?? []).length.toLocaleString("fr-FR")} films vus`}
        title={diaryView ? "Mes séances" : "Mes films"}
        actions={
          <div className="flex rounded-full p-1 ring-1 ring-[var(--line-2)]" role="group" aria-label="Affichage">
            {[
              ["journal", "Journal"],
              ["affiches", "Affiches"],
            ].map(([k, l]) => (
              <Link key={k} href={k === "journal" ? "/films" : "/films?vue=affiches"} aria-current={(k === "journal") === diaryView ? "page" : undefined} className="chip !shadow-none aria-[current=page]:!bg-accent aria-[current=page]:!text-on-accent">
                {l}
              </Link>
            ))}
          </div>
        }
      />

      {diaryView ? (
        <div className="space-y-14">
          {months.map((g) => (
            <section key={g.key} aria-labelledby={`m-${g.key}`} className="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10" data-reveal>
              <h2 id={`m-${g.key}`} className="top-[calc(var(--nav-offset,4.5rem)+1.5rem)] self-start text-[1.9rem] leading-none capitalize md:sticky md:text-[2.2rem]">
                {g.label.split(" ")[0]}
                <span className="mt-1 block text-[15px] text-muted tabular">
                  {g.label.split(" ")[1]} · {g.items.length} film{g.items.length > 1 ? "s" : ""}
                </span>
              </h2>
              <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {g.items.map((d, i) => {
                  const date = new Date(`${d.watched_date}T12:00:00`);
                  return (
                    <li key={`${d.id}-${i}`}>
                      <Link href={`/film/${d.id}`} className="group grid grid-cols-[2.6rem_3rem_minmax(0,1fr)_auto] items-center gap-4 py-3 md:grid-cols-[3.4rem_3.4rem_minmax(0,1fr)_auto] md:gap-6">
                        <span className="text-center">
                          <span className="block font-display text-[1.9rem] leading-none tabular">{date.getDate()}</span>
                          <span className="block text-[12px] text-muted">{DAYS[date.getDay()]}</span>
                        </span>
                        <span className="poster aspect-[2/3] w-full">{d.poster_path && <img src={poster(d.poster_path, "w185")!} alt="" loading="lazy" className="size-full object-cover" />}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-display text-[1.3rem] leading-tight md:text-[1.5rem]">{d.title_fr ?? d.name}</span>
                          <span className="mt-0.5 block truncate text-[13.5px] text-muted">
                            {[d.director, d.year].filter(Boolean).join(", ")}
                            {d.rewatch && <span className="ml-2 rounded-full px-2 py-0.5 text-[11.5px] ring-1 ring-[var(--line-2)]">revu</span>}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 text-[14px]">
                          {d.rating != null && <Stars rating={d.rating} />}
                          {d.liked && (
                            <span className="text-heart" aria-label="coup de cœur">
                              ♥
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {!months.length && (
            <div className="card py-20 text-center">
              <p className="font-display text-3xl">Aucune séance pour l&apos;instant</p>
              <p className="mt-2 text-[15px] text-muted">Importez votre journal Letterboxd depuis votre compte.</p>
              <Link href="/compte" className="btn btn-primary mt-6">
                Importer mon journal
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <Suspense>
            <FilterBar genres={genres} />
          </Suspense>
          {films && films.length ? (
            <FilmGrid films={films} />
          ) : (
            <div className="card py-20 text-center">
              <p className="font-display text-3xl">Aucun film ne correspond</p>
              <p className="mt-2 text-[15px] text-muted">Retirez un filtre ou changez la recherche.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
