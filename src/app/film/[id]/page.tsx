/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Poster } from "@/components/FilmCard";
import { MediaGallery } from "@/components/MediaGallery";
import { OwnButton } from "@/components/OwnButton";
import { PosterPicker } from "@/components/PosterPicker";
import { Soundtrack } from "@/components/Soundtrack";
import { Stars } from "@/components/Stars";
import { TextKind } from "@/components/ActivityFeed";
import { filmCommunity } from "@/lib/social";
import { VideoCard } from "@/components/VideoCard";
import { CASE_TYPES, FORMATS, ownedItem } from "@/lib/collection";
import { critiqueForFilm, readingTime } from "@/lib/critiques";
import { filmMedia } from "@/lib/media";
import { currentPoster } from "@/lib/posters";
import { formatLongDate, formatRuntime } from "@/lib/format";
import { filmDetail, filmDiary, filmLists, filmReviews, type FilmDetail } from "@/lib/queries";
import { ARTICLE_SOURCES, LEGAL_FREE, articleUrl, legalSearchUrl, reviewVideos, youtubeSearchUrl } from "@/lib/sources";
import { backdrop, poster, watchProviders, type Provider } from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const film = await filmDetail(Number((await params).id));
  return { title: film ? film.title_fr ?? film.name : "Film introuvable" };
}

export default async function FilmPage({ params }: Props) {
  const id = Number((await params).id);
  const film = await filmDetail(id);
  if (!film) notFound();
  const [reviews, diary, lists, providers, critique, owned, media, posters] = await Promise.all([
    filmReviews(id),
    filmDiary(id),
    filmLists(id),
    film.tmdb_id ? watchProviders(film.tmdb_id) : null,
    critiqueForFilm(id),
    ownedItem(id),
    filmMedia(id),
    currentPoster(id),
  ]);
  const title = film.title_fr ?? film.name;
  const bg = backdrop(film.backdrop_path);

  return (
    <article className="pt-2 md:pt-8">
      {/* En-tête : image de fond floutée + affiche */}
      <div className="relative -mx-4 overflow-hidden md:mx-0 md:rounded-xl">
        {bg && <img src={bg} alt="" className="absolute inset-0 size-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="relative flex gap-5 px-4 pt-24 pb-4 md:gap-8 md:px-8 md:pt-40">
          <div className="w-28 shrink-0 md:w-56">
            <PosterPicker filmId={id} current={film.poster_path} hasCustom={Boolean(posters.custom)}>
              <Poster film={film} size="w500" className="shadow-2xl shadow-black" />
            </PosterPicker>
          </div>
          <div className="flex min-w-0 flex-col justify-end">
            <h1 className="font-display text-4xl leading-none md:text-6xl">{title}</h1>
            {film.original_title && film.original_title !== title && (
              <p className="mt-1 text-sm text-muted italic">{film.original_title}</p>
            )}
            <p className="mt-3 text-sm text-muted">
              {[film.year, formatRuntime(film.runtime), film.countries.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
            </p>
            {film.directors.length > 0 && (
              <p className="mt-1 text-sm">
                Réalisé par{" "}
                {film.directors.map((d, i) => (
                  <span key={d}>
                    {i > 0 && ", "}
                    <Link href={`/personne?nom=${encodeURIComponent(d)}&role=director`} className="text-accent underline-offset-4 hover:underline">{d}</Link>
                  </span>
                ))}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {film.genres.map((g) => (
                <Link key={g} href={`/films?genre=${encodeURIComponent(g)}`} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted hover:text-foreground">
                  {g}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_280px]">
        <div className="space-y-10">
          {film.overview && <p className="max-w-prose leading-relaxed text-foreground/90">{film.overview}</p>}

          <section>
            <h2 className="mb-4 flex items-center gap-3 font-display text-3xl">Ma critique <TextKind kind="critique" /></h2>
            {critique ? (
              <Link
                href={critique.status === "published" ? `/critiques/${critique.id}` : `/film/${id}/critique`}
                className="group block rounded-xl border border-accent/30 bg-accent-soft p-5 transition hover:border-accent"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  {critique.status === "draft" && <span className="rounded bg-surface-2 px-1.5">brouillon</span>}
                  {critique.rating != null && <Stars rating={critique.rating} />}
                  <span>{readingTime(critique.body)} min de lecture</span>
                </div>
                <h3 className="font-display text-3xl leading-tight group-hover:text-accent">{critique.title || "Sans titre"}</h3>
                {critique.lede && <p className="mt-2 text-foreground/80">{critique.lede}</p>}
                <p className="mt-3 text-sm text-accent">{critique.status === "published" ? "Lire la critique →" : "Continuer l'écriture →"}</p>
              </Link>
            ) : (
              <Link href={`/film/${id}/critique`} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-muted transition hover:border-accent hover:text-accent">
                ✍️ Écrire ma critique
              </Link>
            )}
          </section>

          <MediaGallery filmId={id} media={media} />

          <Suspense fallback={<VideosSkeleton />}>
            <Videos film={film} />
          </Suspense>

          <section>
            <h2 className="mb-1 font-display text-3xl">Lire des critiques</h2>
            <p className="mb-4 text-sm text-muted">Les critiques de ce film chez les meilleures revues.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ARTICLE_SOURCES.map((s) => (
                <a key={s.domain} href={articleUrl(s, film)} target="_blank" rel="noreferrer" className="group rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-accent/60">
                  <span className="flex items-center justify-between font-medium group-hover:text-accent">
                    {s.name} <span className="text-xs text-muted">{s.lang.toUpperCase()} ↗</span>
                  </span>
                  <span className="text-xs text-muted">{s.description}</span>
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-3 font-display text-3xl">Mes reviews <TextKind kind="review" /></h2>
            {reviews.length ? (
              <div className="space-y-4">
                {reviews.map((r, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm text-muted">
                      {r.rating != null && <Stars rating={r.rating} className="text-base" />}
                      <span>Vu le {formatLongDate(r.watchedDate)}</span>
                      {r.rewatch && <span className="rounded bg-surface-2 px-1.5 text-xs">revu</span>}
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">{r.review}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">Aucune review Letterboxd pour ce film.</p>
            )}
          </section>

          <Suspense fallback={null}>
            <Members filmId={id} />
          </Suspense>

          {film.cast.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-3xl">Casting</h2>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {film.cast.map((c) => (
                  <li key={c.name + c.character}>
                    <Link href={`/personne?nom=${encodeURIComponent(c.name)}&role=actor`} className="hover:text-accent">{c.name}</Link>
                    {c.character && <span className="block text-xs text-muted">{c.character}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5">
            {film.watched_date || diary.length ? (
              <>
                <div className="flex items-center gap-2">
                  {film.rating != null ? <Stars rating={film.rating} className="text-2xl" /> : <span className="text-muted">Pas noté</span>}
                  {film.liked && <span className="text-2xl text-heart">♥</span>}
                </div>
                {diary.length > 0 && (
                  <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm text-muted">
                    {diary.map((d, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{formatLongDate(d.watchedDate)}{d.rewatch && " · revu"}</span>
                        {d.rating != null && <Stars rating={d.rating} />}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-muted">{film.in_watchlist ? "Dans ta watchlist" : "Pas encore vu"}</p>
            )}
          </div>

          <OwnButton
            filmId={id}
            initial={owned}
            formats={FORMATS}
            caseTypes={CASE_TYPES}
            film={{ id, href: `/film/${id}`, title, year: film.year, director: film.directors[0] ?? null, runtime: film.runtime, image: backdrop(film.backdrop_path), poster: poster(film.poster_path, "w500") }}
          />

          <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-surface" />}>
            <Soundtrack titles={[film.original_title, film.name, film.title_fr]} />
          </Suspense>

          <Link href={`/agenda?film=${id}`} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition hover:border-accent/60">
            <span className="font-display">📅 Planifier une séance</span>
            <span className="text-accent">→</span>
          </Link>


          {film.tmdb_id && (
            <Link href={`/conseils?from=${id}&partout=1`} className="flex items-center justify-between rounded-xl border border-border bg-surface p-5 transition hover:border-accent/60">
              <span className="font-medium">Films dans le même esprit</span>
              <span className="text-accent">→</span>
            </Link>
          )}

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 font-medium">Où regarder</h3>
            {providers && (providers.flatrate.length > 0 || providers.rent.length > 0 || providers.buy.length > 0) ? (
              <>
                <ProviderRow label="Abonnement" items={providers.flatrate} link={providers.link} />
                <ProviderRow label="Location" items={providers.rent} link={providers.link} />
                <ProviderRow label="Achat" items={providers.buy} link={providers.link} />
                <a href={providers.link} target="_blank" rel="noreferrer" className="block text-xs text-muted hover:text-accent">
                  Toutes les offres (JustWatch) ↗
                </a>
              </>
            ) : (
              <p className="text-sm text-muted">Pas d&apos;offre en France en ce moment.</p>
            )}
            <p className="mt-4 mb-1.5 border-t border-border pt-4 text-xs uppercase tracking-wider text-muted">Au cinéma à Paris</p>
            <div className="mb-1 flex flex-wrap gap-1.5">
              <a href="https://www.paris-cine.info/" target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-accent">Paris Ciné Info ↗</a>
              <a href={`https://www.allocine.fr/rechercher/?q=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-accent">Allociné ↗</a>
            </div>
            <p className="mt-4 mb-1.5 border-t border-border pt-4 text-xs uppercase tracking-wider text-muted">Gratuit et légal ?</p>
            <div className="flex flex-wrap gap-1.5">
              {LEGAL_FREE.map((s) => (
                <a key={s.domain} href={legalSearchUrl(s.domain, film)} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-accent">
                  {s.name} ↗
                </a>
              ))}
            </div>
          </div>

          {lists.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="mb-2 font-medium">Dans mes listes</h3>
              {lists.map((l) => (
                <Link key={l.slug} href={`/listes/${l.slug}`} className="block py-0.5 text-sm text-muted hover:text-accent">
                  {l.name}
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 text-sm">
            {film.lb_uri && (
              <a href={film.lb_uri} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">Voir sur Letterboxd ↗</a>
            )}
            {film.tmdb_id && (
              <a href={`https://www.themoviedb.org/movie/${film.tmdb_id}`} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">Voir sur TMDB ↗</a>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

function ProviderRow({ label, items, link }: { label: string; items: Provider[]; link: string }) {
  if (!items.length) return null;
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs uppercase tracking-wider text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <a key={p.provider_id} href={link} target="_blank" rel="noreferrer" title={p.provider_name}>
            <img src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} className="size-9 rounded-lg transition hover:scale-110" />
          </a>
        ))}
      </div>
    </div>
  );
}

// Chargé à part (Suspense) : la fiche s'affiche tout de suite, les vidéos arrivent ensuite.
async function Videos({ film }: { film: FilmDetail }) {
  const videos = await reviewVideos(film);
  const title = film.title_fr ?? film.name;
  const director = film.directors[0] ?? "";
  return (
    <section>
      <h2 className="font-display text-3xl">Analyses vidéo</h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        Uniquement des sources reconnues : Arte, Cahiers du cinéma, Cinémathèque, France Culture, Criterion, BFI, Every Frame a Painting…
      </p>
      {videos?.length ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">
          {videos === null
            ? "Vidéos indisponibles (clé YouTube manquante ou quota du jour atteint)."
            : "Aucune analyse de ces sources pour ce film. Tu peux chercher directement :"}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              ["Blow Up (Arte)", `blow up arte ${title}`],
              ["Cahiers du cinéma", `cahiers du cinéma ${title}`],
              ["Cinémathèque", `cinémathèque française ${director || title}`],
              ["Criterion", `criterion ${film.original_title ?? film.name}`],
            ].map(([label, q]) => (
              <a key={label} href={youtubeSearchUrl(q)} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-2.5 py-1 text-xs hover:text-accent">
                {label} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function VideosSkeleton() {
  return (
    <section>
      <h2 className="mb-4 font-display text-3xl">Analyses vidéo</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className="aspect-video animate-pulse rounded-lg bg-surface-2" />)}
      </div>
    </section>
  );
}

// « Les membres » : ce que les autres ont pensé de ce film (notes, reviews Letterboxd, critiques Dreams partagées).
async function Members({ filmId }: { filmId: number }) {
  const c = await filmCommunity(filmId);
  if (!c.people.length && !c.critiques.length) return null;
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-3xl">Les membres</h2>
        {c.average != null && <span className="text-sm text-muted">moyenne <span className="font-display text-xl text-accent">{c.average.toFixed(1).replace(".", ",")}★</span></span>}
      </div>
      {c.critiques.length > 0 && (
        <div className="mb-5 space-y-3">
          {c.critiques.map((k) => (
            <Link key={k.id} href={`/critiques/${k.id}`} className="group block rounded-2xl border border-accent/30 bg-accent-soft p-4 hover:border-accent">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <TextKind kind="critique" />
                <span className="text-foreground">{k.author}</span>
                {k.rating != null && <Stars rating={k.rating} />}
              </div>
              <h3 className="mt-2 text-2xl leading-tight group-hover:text-accent">{k.title || k.filmTitle}</h3>
              {k.lede && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{k.lede}</p>}
            </Link>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {c.people.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/membre/${p.id}`} className="font-display flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">{p.name.slice(0, 1).toUpperCase()}</Link>
              <Link href={`/membre/${p.id}`} className="hover:text-accent">{p.name}</Link>
              {p.rating != null && <Stars rating={p.rating} />}
              {p.liked && <span className="text-heart">♥</span>}
              {p.lastSeen && <span className="ml-auto text-xs text-muted">vu le {formatLongDate(p.lastSeen.slice(0, 10))}</span>}
            </div>
            {p.letterboxdReview && (
              <div className="mt-2 border-l-2 border-border pl-3">
                <TextKind kind="review" />
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-foreground/80">{p.letterboxdReview}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
