/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed, TextKind } from "@/components/ActivityFeed";
import { SpineRow } from "@/components/dreams/SpineRow";
import { LetterboxdSyncButton } from "@/components/LetterboxdConnect";
import { Stars } from "@/components/Stars";
import { requireUser } from "@/lib/auth";
import { ownedFilms } from "@/lib/collection";
import { db } from "@/lib/db";
import { formatLongDate } from "@/lib/format";
import { topPeople } from "@/lib/people";
import { favoriteFilms, recentDiary } from "@/lib/queries";
import { activity, memberName, sharedCritiques } from "@/lib/social";
import { statsOverview, topJson } from "@/lib/stats";
import { backdrop, poster } from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }> };

// La synchronisation Letterboxd lancée depuis le profil peut prendre un moment.
export const maxDuration = 60;

async function memberId(params: Props["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = await memberId(params);
  const m = id ? await memberName(id) : null;
  return { title: m?.name ?? "Membre" };
}

// Profil d'un membre, façon Letterboxd. Lecture seule : on ne modifie jamais les données d'un autre.
export default async function MemberPage({ params }: Props) {
  const me = await requireUser();
  const id = await memberId(params);
  const member = id ? await memberName(id) : null;
  if (!id || !member) notFound();

  const [stats, favorites, recent, critiques, owned, genres, directors, feed] = await Promise.all([
    statsOverview(id), favoriteFilms(12, id), recentDiary(12, id), sharedCritiques({ userId: id, limit: 12 }),
    ownedFilms(undefined, id), topJson("genres", 5, id), topPeople("director", 5, id), activity({ userId: id, limit: 12 }),
  ]);
  const isMe = id === me.id;
  const letterboxd = isMe ? (await db().execute({ sql: "SELECT letterboxd_username FROM users WHERE id = ?", args: [id] })).rows[0]?.letterboxd_username : null;
  const hero = favorites.find((f) => f.backdrop_path);

  return (
    <div className="space-y-16 md:space-y-24">
      {/* En-tête du profil : l'image de son film préféré, plein cadre, et sa carte de membre */}
      <header className="relative">
        <div className="full-bleed absolute inset-x-0 top-[-4rem] bottom-0 overflow-hidden" aria-hidden>
          {hero && <img src={backdrop(hero.backdrop_path)!} alt="" className="dm-hero-img opacity-70" />}
          <div className="dm-hero-fade" />
        </div>
        <div className="relative flex min-h-[min(62svh,560px)] flex-col justify-end pt-20 pb-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-6">
            <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_40%,#000))] font-display text-5xl text-on-accent shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)] ring-4 ring-background md:size-32 md:text-7xl">
              {member.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 self-stretch sm:self-auto">
              <h1 className="text-[clamp(2.6rem,7vw,6rem)] leading-[0.95] break-words">{member.username ? `@${member.username}` : member.name}</h1>
              <p className="mt-2 text-[15px] text-muted">
                {member.username && `${member.firstName}, `}membre depuis le {formatLongDate(member.createdAt.slice(0, 10))}
              </p>
            </div>
            {isMe && (
              <div className="flex flex-wrap items-start gap-2">
                {letterboxd ? <LetterboxdSyncButton /> : null}
                <Link href="/compte" className="btn">
                  Modifier mon compte
                </Link>
              </div>
            )}
          </div>
        </div>
        <dl className="relative grid grid-cols-2 border-y border-[var(--dm-line)] md:grid-cols-4">
          {[
            [stats.watched.toLocaleString("fr-FR"), "films vus"],
            [String(stats.thisYear), `en ${new Date().getFullYear()}`],
            [stats.avgRating != null ? `${stats.avgRating.toFixed(1).replace(".", ",")}★` : "—", "note moyenne"],
            [String(owned.length), "dans sa collection"],
          ].map(([v, l], i) => (
            <div key={l} className={`flex flex-col-reverse py-6 md:py-8 ${i % 2 ? "border-l border-[var(--dm-line)] pl-5 md:pl-8" : ""} ${i === 2 ? "md:border-l md:border-[var(--dm-line)] md:pl-8" : ""} ${i > 1 ? "border-t border-[var(--dm-line)] md:border-t-0" : ""}`}>
              <dt className="mt-2 text-[14px] text-muted">{l}</dt>
              <dd className="font-display text-[clamp(2.4rem,5vw,4rem)] leading-none tabular">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Sa collection : ses DVD, vus par la tranche, chacun à l'épaisseur de son édition */}
      {owned.length > 0 && (
        <section data-reveal>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-[2rem] leading-none md:text-[2.6rem]">{isMe ? "Ma" : "Sa"} collection</h2>
            <p className="text-[14px] text-muted">{owned.length} boîtiers</p>
          </div>
          <div className="no-scrollbar bleed overflow-x-auto">
            <SpineRow films={owned.map((o) => ({ id: o.id, title: o.title_fr ?? o.name, director: o.director, runtime: o.runtime, edition: o.edition, caseType: o.caseType, color: o.color, href: `/film/${o.id}` }))} height={260} />
          </div>
        </section>
      )}

      {/* Ses 10 films préférés : un classement, donc numéroté */}
      {favorites.length > 0 ? (
        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-[2rem] leading-none md:text-[2.6rem]">{isMe ? "Mes" : "Ses"} 10 films</h2>
            {isMe && (
              <Link href="/preferes" className="arrow-link min-h-10 text-[14px] text-muted hover:text-foreground">
                Modifier le classement
              </Link>
            )}
          </div>
          <ol className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-5 md:gap-x-6">
            {favorites.slice(0, 10).map((f, i) => (
              <li key={f.id}>
                <Link href={`/film/${f.id}`} className="group block">
                  <div className="poster aspect-[2/3]">
                    {f.poster_path && <img src={poster(f.poster_path, "w342")!} alt={f.title_fr ?? f.name} loading="lazy" className="size-full object-cover" />}
                  </div>
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-2xl leading-none tabular text-muted">{i + 1}</span>
                    <span className="truncate text-[14.5px] font-medium">{f.title_fr ?? f.name}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        isMe && (
          <Link href="/preferes" className="card card-hover block p-8 text-center">
            <span className="block font-display text-3xl">Choisissez vos 10 films</span>
            <span className="mt-2 block text-[15px] text-muted">Ils s&apos;afficheront ici, en tête de votre profil.</span>
          </Link>
        )
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-12">
          <section>
            <h2 className="mb-5 text-[2rem] leading-none md:text-[2.4rem]">Critiques Dreams</h2>
            {critiques.length ? (
              <div className="space-y-3">
                {critiques.map((c) => (
                  <Link key={c.id} href={`/critiques/${c.id}`} className="group flex gap-4 card p-4 transition hover:border-accent/60">
                    {c.poster && <img src={poster(c.poster, "w185")!} alt="" className="aspect-[2/3] w-16 shrink-0 rounded-md object-cover" />}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><TextKind kind="critique" />{c.visibility === "prive" && <span className="text-xs text-muted">privée</span>}</div>
                      <p className="mt-1 text-xs text-muted">{c.filmTitle} · {c.year}</p>
                      <h3 className="text-xl leading-tight group-hover:text-accent">{c.title || c.filmTitle}</h3>
                      {c.lede && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.lede}</p>}
                      {c.rating != null && <Stars rating={c.rating} className="mt-1 block text-xs" />}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">{isMe ? "Tu n'as pas encore publié de critique pour les membres." : "Pas encore de critique partagée."}</p>
            )}
          </section>

          <section>
            <h2 className="mb-5 text-[2rem] leading-none md:text-[2.4rem]">Activité récente</h2>
            <ActivityFeed items={feed} />
          </section>
        </div>

        <aside className="space-y-8">
          {recent.length > 0 && (
            <section>
              <h3 className="mb-3 text-xl">Derniers films vus</h3>
              <div className="grid grid-cols-4 gap-2">
                {recent.slice(0, 8).map((f, i) => (
                  <Link key={`${f.id}-${i}`} href={`/film/${f.id}`} title={f.title_fr ?? f.name} className="aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
                    {f.poster_path && <img src={poster(f.poster_path, "w185")!} alt={f.title_fr ?? f.name} className="size-full object-cover" />}
                  </Link>
                ))}
              </div>
            </section>
          )}
          {genres.length > 0 && (
            <section>
              <h3 className="mb-3 text-xl">Genres favoris</h3>
              <div className="flex flex-wrap gap-1.5">{genres.map((g) => <span key={g.key} className="rounded-full bg-surface-2 px-3 py-1 text-xs">{g.label} · {g.value}</span>)}</div>
            </section>
          )}
          {directors.length > 0 && (
            <section>
              <h3 className="mb-3 text-xl">Cinéastes les plus vus</h3>
              <ol className="space-y-1 text-sm">
                {directors.map((d, i) => (
                  <li key={d.name} className="flex justify-between gap-2">
                    <Link href={`/personne?nom=${encodeURIComponent(d.name)}&role=director`} className="truncate hover:text-accent">{i + 1}. {d.name}</Link>
                    <span className="text-muted">{d.seen}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
