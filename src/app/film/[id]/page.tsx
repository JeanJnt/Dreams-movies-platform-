/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DiscStylePicker } from "@/components/DiscStylePicker";
import { discStyles } from "@/lib/disc-style";
import { Poster } from "@/components/FilmCard";
import { MediaGallery } from "@/components/MediaGallery";
import { OwnButton } from "@/components/OwnButton";
import { PosterPicker } from "@/components/PosterPicker";
import { Soundtrack } from "@/components/Soundtrack";
import { Stars } from "@/components/Stars";
import { TextKind } from "@/components/ActivityFeed";
import { VideoCard } from "@/components/VideoCard";
import { Projection } from "@/components/fx/Projection";
import { ChapterNav } from "@/components/ui/ChapterNav";
import { TitleWords } from "@/components/ui/PageHeader";
import { Arrow } from "@/components/ui/Section";
import { Tilt } from "@/components/ui/Tilt";
import { filmCommunity } from "@/lib/social";
import { CASE_TYPES, FORMATS, ownedItem } from "@/lib/collection";
import { critiqueForFilm, readingTime } from "@/lib/critiques";
import { filmMedia } from "@/lib/media";
import { currentPoster } from "@/lib/posters";
import { currentUser } from "@/lib/auth";
import { formatLongDate, formatRuntime, letterboxdUrl, showtimeLinks } from "@/lib/format";
import { filmTitles } from "@/lib/titles";
import { filmDetail, filmDiary, filmLists, filmReviews, type FilmDetail } from "@/lib/queries";
import { ARTICLE_SOURCES, LEGAL_FREE, articleUrl, legalSearchUrl, reviewVideos, youtubeSearchUrl } from "@/lib/sources";
import { backdrop, poster, watchProviders, type Provider } from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const film = await filmDetail(Number((await params).id));
  return { title: film ? film.title_fr ?? film.name : "Film introuvable" };
}

const CHAPTERS = [
  { id: "synopsis", label: "Synopsis" },
  { id: "critique", label: "Ma critique" },
  { id: "galerie", label: "Galerie" },
  { id: "videos", label: "Analyses" },
  { id: "presse", label: "Presse" },
  { id: "reviews", label: "Reviews" },
  { id: "membres", label: "Les membres" },
  { id: "casting", label: "Casting" },
];

// Titre de chapitre de la fiche : numéro discret + titre en serif
function H2({ n, children, aside }: { n: number; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
      <h2 className="flex items-baseline gap-3 font-display text-[1.9rem] leading-none md:text-[2.4rem]">
        <span className="font-mono text-[11px] tracking-widest text-accent">{String(n).padStart(2, "0")}</span>
        {children}
      </h2>
      {aside}
    </div>
  );
}

export default async function FilmPage({ params }: Props) {
  const id = Number((await params).id);
  const film = await filmDetail(id);
  if (!film) notFound();
  const [reviews, diary, lists, providers, critique, owned, media, posters, me] = await Promise.all([
    filmReviews(id),
    filmDiary(id),
    filmLists(id),
    film.tmdb_id ? watchProviders(film.tmdb_id) : null,
    critiqueForFilm(id),
    ownedItem(id),
    filmMedia(id),
    currentPoster(id),
    currentUser(),
  ]);
  const title = film.title_fr ?? film.name;
  // En grand le titre original, en petit sa traduction dans la langue choisie par le membre.
  const titles = filmTitles(film, me?.titleLang ?? "fr");
  const discBase = { id: film.id, title, year: film.year, director: film.directors[0] ?? null, runtime: film.runtime, image: backdrop(film.backdrop_path) ?? poster(film.poster_path, "w500"), badge: owned?.format };
  const discStyle = (await discStyles([{ id: film.id, image: discBase.image }])).get(film.id);
  const bg = backdrop(film.backdrop_path);
  const meta = [film.media_type === "tv" ? "Série" : "Film", film.year, formatRuntime(film.runtime), film.countries.slice(0, 2).join(", ")].filter(Boolean);
  const seen = Boolean(film.watched_date || diary.length);

  return (
    <article>
      {/* ——— L'écran : l'image du film projetée plein cadre ——— */}
      <header className="relative ml-[calc(50%-50vw)] w-screen md:-mt-[4.25rem]">
        <div className="relative h-[46svh] min-h-[20rem] md:h-[78svh] md:max-h-[52rem]">
          {bg ? <Projection src={bg} className="absolute inset-0" focus={0.04} /> : <div className="absolute inset-0 bg-surface" />}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/80 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          {/* Le disque du film : on le touche pour choisir son habillage */}
          <div className="spin-slow absolute top-4 right-4 z-10 aspect-square w-24 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] md:top-24 md:right-10 md:w-56">
            <DiscStylePicker filmId={id} disc={{ ...discBase, ...discStyle }} />
          </div>
        </div>

        {/* Affiche en relief, qui déborde sous l'écran, et le titre */}
        <div className="relative mx-auto -mt-28 max-w-[88rem] px-[var(--gutter)] md:-mt-64">
          <div className="flex items-end gap-5 md:gap-10">
            <Tilt className="w-28 shrink-0 sm:w-36 md:w-64" max={8}>
              <PosterPicker filmId={id} current={film.poster_path} hasCustom={Boolean(posters.custom)}>
                <Poster film={film} size="w500" className="!rounded-xl shadow-[0_40px_80px_-30px_#000]" />
              </PosterPicker>
            </Tilt>
            <div className="min-w-0 pb-1 md:pb-4">
              <p className="eyebrow mb-3 md:mb-5">{meta.join(" · ")}</p>
              <h1 className="font-display text-[clamp(2.3rem,7.5vw,7rem)] leading-[0.88] text-balance">
                <TitleWords text={titles.main} />
              </h1>
              {titles.sub && <p className="mt-2 text-base text-muted italic md:mt-3 md:text-xl">{titles.sub}</p>}
              {film.directors.length > 0 && (
                <p className="mt-3 text-sm md:mt-5 md:text-base">
                  <span className="text-muted">Réalisé par </span>
                  {film.directors.map((d, i) => (
                    <span key={d}>
                      {i > 0 && ", "}
                      <Link href={`/personne?nom=${encodeURIComponent(d)}&role=director`} className="link-draw text-accent">{d}</Link>
                    </span>
                  ))}
                </p>
              )}
              <div className="mt-4 hidden flex-wrap gap-1.5 sm:flex">
                {film.genres.map((g) => (
                  <Link key={g} href={`/films?genre=${encodeURIComponent(g)}`} className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-accent/60 hover:text-foreground">
                    {g}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {/* Genres sous l'affiche, sur téléphone */}
          <div className="mt-4 flex flex-wrap gap-1.5 sm:hidden">
            {film.genres.map((g) => (
              <Link key={g} href={`/films?genre=${encodeURIComponent(g)}`} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                {g}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-10 md:mt-14">
        <ChapterNav chapters={CHAPTERS} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 md:mt-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
        <div className="min-w-0 space-y-16 md:space-y-20">
          {film.overview && (
            <section id="synopsis" className="reveal scroll-mt-32">
              <p className="eyebrow mb-4">Synopsis</p>
              <p className="max-w-3xl font-display text-[1.3rem] leading-[1.45] text-foreground/90 md:text-[1.6rem]">{film.overview}</p>
            </section>
          )}

          <section id="critique" className="reveal scroll-mt-32">
            <H2 n={1} aside={<TextKind kind="critique" />}>Ma critique</H2>
            {critique ? (
              <Link
                href={critique.status === "published" ? `/critiques/${critique.id}` : `/film/${id}/critique`}
                className="card card-hover group block overflow-hidden !border-accent/30 !bg-accent-soft p-6 md:p-8"
              >
                <div className="mb-3 flex items-center gap-3 text-xs text-muted">
                  {critique.status === "draft" && <span className="eyebrow rounded-full border border-border px-2 py-1">brouillon</span>}
                  {critique.rating != null && <Stars rating={critique.rating} />}
                  <span className="font-mono">{readingTime(critique.body)} min de lecture</span>
                </div>
                <h3 className="font-display text-3xl leading-tight transition-colors group-hover:text-accent md:text-[2.6rem]">{critique.title || "Sans titre"}</h3>
                {critique.lede && <p className="mt-3 max-w-2xl text-foreground/80 md:text-lg">{critique.lede}</p>}
                <p className="arrow-link mt-5 text-sm text-accent">
                  {critique.status === "published" ? "Lire la critique" : "Continuer l'écriture"} <Arrow />
                </p>
              </Link>
            ) : (
              <Link href={`/film/${id}/critique`} className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center transition hover:border-accent hover:bg-accent-soft">
                <span className="font-display text-3xl transition-colors group-hover:text-accent">Écrire ma critique</span>
                <span className="text-sm text-muted">Titre, chapeau, intertitres, citations — enregistrée au fil de l&apos;écriture.</span>
              </Link>
            )}
          </section>

          <div id="galerie" className="reveal scroll-mt-32">
            <MediaGallery filmId={id} media={media} />
          </div>

          <div id="videos" className="reveal scroll-mt-32">
            <Suspense fallback={<VideosSkeleton />}>
              <Videos film={film} />
            </Suspense>
          </div>

          <section id="presse" className="reveal scroll-mt-32">
            <H2 n={2}>Lire la presse</H2>
            <p className="-mt-2 mb-5 text-sm text-muted">Les critiques de ce film chez les meilleures revues.</p>
            <div className="no-scrollbar swipe-row bleed flex gap-3 overflow-x-auto sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
              {ARTICLE_SOURCES.map((s) => (
                <a key={s.domain} href={articleUrl(s, film)} target="_blank" rel="noreferrer" className="card card-hover group !rounded-xl px-4 py-3.5">
                  <span className="flex items-center justify-between gap-3 font-medium transition-colors group-hover:text-accent">
                    {s.name} <span className="font-mono text-[10px] text-muted">{s.lang.toUpperCase()}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{s.description}</span>
                </a>
              ))}
            </div>
          </section>

          <section id="reviews" className="reveal scroll-mt-32">
            <H2 n={3} aside={<TextKind kind="review" />}>Mes reviews</H2>
            {reviews.length ? (
              <div className="space-y-4">
                {reviews.map((r, i) => (
                  <figure key={i} className="card p-6">
                    <figcaption className="mb-3 flex items-center gap-3 text-sm text-muted">
                      {r.rating != null && <Stars rating={r.rating} className="text-base" />}
                      <span className="font-mono text-xs">Vu le {formatLongDate(r.watchedDate)}</span>
                      {r.rewatch && <span className="eyebrow rounded-full border border-border px-2 py-1">revu</span>}
                    </figcaption>
                    <blockquote className="whitespace-pre-line leading-relaxed text-foreground/90">{r.review}</blockquote>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="text-muted">Aucune review Letterboxd pour ce film.</p>
            )}
          </section>

          <div id="membres" className="scroll-mt-32">
            <Suspense fallback={null}>
              <Members filmId={id} />
            </Suspense>
          </div>

          {film.cast.length > 0 && (
            <section id="casting" className="reveal scroll-mt-32">
              <H2 n={5}>Casting</H2>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                {film.cast.map((c) => (
                  <li key={c.name + c.character} className="border-l border-[var(--line)] pl-3">
                    <Link href={`/personne?nom=${encodeURIComponent(c.name)}&role=actor`} className="link-draw hover:text-accent">{c.name}</Link>
                    {c.character && <span className="mt-0.5 block text-xs text-muted italic">{c.character}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ——— Colonne : ma séance, ma collection, où le voir ——— */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-36 lg:self-start">
          <div className="card p-6">
            <p className="eyebrow mb-4">Mon visionnage</p>
            {seen ? (
              <>
                <div className="flex items-center gap-3">
                  {film.rating != null ? <Stars rating={film.rating} className="text-3xl" /> : <span className="text-muted">Pas noté</span>}
                  {film.liked && <span className="text-3xl text-heart drop-shadow-[0_0_12px_var(--heart)]">♥</span>}
                </div>
                {diary.length > 0 && (
                  <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted">
                    {diary.map((d, i) => (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs">
                          {formatLongDate(d.watchedDate)}
                          {d.rewatch && " · revu"}
                        </span>
                        {d.rating != null && <Stars rating={d.rating} />}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="font-display text-2xl">{film.in_watchlist ? "Dans ta watchlist" : "Pas encore vu"}</p>
            )}
          </div>

          <OwnButton
            filmId={id}
            initial={owned}
            formats={FORMATS}
            caseTypes={CASE_TYPES}
            film={{ id, href: `/film/${id}`, title, year: film.year, director: film.directors[0] ?? null, runtime: film.runtime, image: backdrop(film.backdrop_path), poster: poster(film.poster_path, "w500") }}
          />

          <div className="card p-6">
            <p className="eyebrow mb-4">Où le voir</p>
            {providers && (providers.flatrate.length > 0 || providers.rent.length > 0 || providers.buy.length > 0) ? (
              <>
                <ProviderRow label="Abonnement" items={providers.flatrate} link={providers.link} />
                <ProviderRow label="Location" items={providers.rent} link={providers.link} />
                <ProviderRow label="Achat" items={providers.buy} link={providers.link} />
              </>
            ) : (
              <p className="text-sm text-muted">Pas d&apos;offre en France en ce moment.</p>
            )}
            <a href={showtimeLinks(title, me?.city ?? "Paris", me?.country ?? "FR")[0].href} target="_blank" rel="noreferrer" className="arrow-link mt-4 text-sm text-accent">
              Séances à {me?.city ?? "Paris"} <Arrow />
            </a>
            <details className="group mt-3 text-sm">
              <summary className="cursor-pointer list-none text-muted transition-colors hover:text-foreground">
                <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> Gratuit et légal
              </summary>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-3">
                {LEGAL_FREE.map((s) => (
                  <a key={s.domain} href={legalSearchUrl(s.domain, film)} target="_blank" rel="noreferrer" className="link-draw text-muted hover:text-accent">
                    {s.name}
                  </a>
                ))}
              </div>
            </details>
          </div>

          <Suspense fallback={<div className="skeleton h-24 rounded-2xl" />}>
            <Soundtrack titles={[film.original_title, film.name, film.title_fr]} tmdbId={film.tmdb_id} />
          </Suspense>

          {lists.length > 0 && (
            <div className="card p-6">
              <p className="eyebrow mb-3">Dans mes listes</p>
              {lists.map((l) => (
                <Link key={l.slug} href={`/listes/${l.slug}`} className="block py-1 text-sm text-foreground/80 transition-colors hover:text-accent">
                  {l.name}
                </Link>
              ))}
            </div>
          )}

          {/* Les autres actions, en une seule liste */}
          <nav className="card divide-y divide-border overflow-hidden text-sm">
            <ActionLink href={`/agenda?film=${id}`}>Planifier une séance</ActionLink>
            {film.tmdb_id && <ActionLink href={`/conseils?from=${id}&partout=1`}>Films dans le même esprit</ActionLink>}
            <ActionLink href={letterboxdUrl(film)} external>
              Letterboxd <span className="text-muted">· note moyenne, avis</span>
            </ActionLink>
            {film.tmdb_id && (
              <ActionLink href={`https://www.themoviedb.org/movie/${film.tmdb_id}`} external>
                TMDB
              </ActionLink>
            )}
          </nav>
        </aside>
      </div>
    </article>
  );
}

function ActionLink({ href, external, children }: { href: string; external?: boolean; children: React.ReactNode }) {
  const cls = "arrow-link flex w-full justify-between px-6 py-3.5 transition-colors hover:bg-surface-2";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      <span>{children}</span>
      <Arrow className="size-3.5 -rotate-45 text-muted" />
    </a>
  ) : (
    <Link href={href} className={cls}>
      <span>{children}</span>
      <Arrow className="size-3.5 text-muted" />
    </Link>
  );
}

function ProviderRow({ label, items, link }: { label: string; items: Provider[]; link: string }) {
  if (!items.length) return null;
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <a key={p.provider_id} href={link} target="_blank" rel="noreferrer" title={p.provider_name}>
            <img src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} className="size-10 rounded-xl ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:scale-105" />
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
      <div className="mb-6 border-b border-[var(--line)] pb-4">
        <h2 className="font-display text-[1.9rem] leading-none md:text-[2.4rem]">Analyses vidéo</h2>
        <p className="mt-2 text-sm text-muted">Uniquement des sources reconnues : Arte, Cahiers du cinéma, Cinémathèque, France Culture, Criterion, BFI, Every Frame a Painting…</p>
      </div>
      {videos?.length ? (
        <div className="no-scrollbar swipe-row bleed flex gap-3 overflow-x-auto sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-7 sm:overflow-visible sm:px-0">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          {videos === null
            ? "Vidéos indisponibles (clé YouTube manquante ou quota du jour atteint)."
            : "Aucune analyse de ces sources pour ce film. Tu peux chercher directement :"}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[
              ["Blow Up (Arte)", `blow up arte ${title}`],
              ["Cahiers du cinéma", `cahiers du cinéma ${title}`],
              ["Cinémathèque", `cinémathèque française ${director || title}`],
              ["Criterion", `criterion ${film.original_title ?? film.name}`],
            ].map(([label, q]) => (
              <a key={label} href={youtubeSearchUrl(q)} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 text-xs transition hover:border-accent/60 hover:text-accent">
                {label}
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
      <div className="mb-6 border-b border-[var(--line)] pb-4">
        <h2 className="font-display text-[1.9rem] leading-none md:text-[2.4rem]">Analyses vidéo</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className="skeleton aspect-video rounded-xl" />)}
      </div>
    </section>
  );
}

// « Les membres » : ce que les autres ont pensé de ce film (notes, reviews Letterboxd, critiques Dreams partagées).
async function Members({ filmId }: { filmId: number }) {
  const c = await filmCommunity(filmId);
  if (!c.people.length && !c.critiques.length) return null;
  return (
    <section className="reveal">
      <H2
        n={4}
        aside={c.average != null && (
          <span className="text-sm text-muted">
            moyenne <span className="font-display text-2xl text-accent">{c.average.toFixed(1).replace(".", ",")}★</span>
          </span>
        )}
      >
        Les membres
      </H2>
      {c.critiques.length > 0 && (
        <div className="mb-5 space-y-3">
          {c.critiques.map((k) => (
            <Link key={k.id} href={`/critiques/${k.id}`} className="card card-hover group block !border-accent/30 !bg-accent-soft p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <TextKind kind="critique" />
                <span className="text-foreground">{k.author}</span>
                {k.rating != null && <Stars rating={k.rating} />}
              </div>
              <h3 className="mt-2 font-display text-2xl leading-tight transition-colors group-hover:text-accent">{k.title || k.filmTitle}</h3>
              {k.lede && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{k.lede}</p>}
            </Link>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {c.people.map((p) => (
          <li key={p.id} className="card !rounded-2xl p-4">
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/membre/${p.id}`} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-base text-on-accent">{p.name.slice(0, 1).toUpperCase()}</Link>
              <Link href={`/membre/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link>
              {p.rating != null && <Stars rating={p.rating} />}
              {p.liked && <span className="text-heart">♥</span>}
              {p.lastSeen && <span className="ml-auto font-mono text-[11px] text-muted">vu le {formatLongDate(p.lastSeen.slice(0, 10))}</span>}
            </div>
            {p.letterboxdReview && (
              <div className="mt-3 border-l-2 border-border pl-3">
                <TextKind kind="review" />
                <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-sm text-foreground/80">{p.letterboxdReview}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
