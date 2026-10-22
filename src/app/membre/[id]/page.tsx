/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed, TextKind } from "@/components/ActivityFeed";
import { DvdCase } from "@/components/DvdCase";
import { FilmCard } from "@/components/FilmCard";
import { Stars } from "@/components/Stars";
import { requireUser } from "@/lib/auth";
import { ownedFilms } from "@/lib/collection";
import { formatLongDate } from "@/lib/format";
import { topPeople } from "@/lib/people";
import { favoriteFilms, recentDiary } from "@/lib/queries";
import { activity, memberName, sharedCritiques } from "@/lib/social";
import { statsOverview, topJson } from "@/lib/stats";
import { backdrop, poster } from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }> };

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
  const hero = favorites.find((f) => f.backdrop_path);

  return (
    <div className="space-y-12 pt-2 md:pt-8">
      {/* En-tête du profil */}
      <header className="relative overflow-hidden rounded-3xl border border-border">
        {hero && <img src={backdrop(hero.backdrop_path)!} alt="" className="absolute inset-0 size-full object-cover opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
        <div className="relative flex flex-wrap items-end gap-5 p-6 pt-24 md:p-8 md:pt-32">
          <span className="font-display flex size-24 items-center justify-center rounded-full bg-accent text-5xl text-on-accent shadow-xl">{member.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-5xl leading-none md:text-6xl">{member.username ? `@${member.username}` : member.name}</h1>
            <p className="mt-2 text-sm text-muted">{member.username && `${member.firstName} · `}Membre depuis le {formatLongDate(member.createdAt.slice(0, 10))}</p>
          </div>
          {isMe && <Link href="/compte" className="rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-accent">Modifier mon compte</Link>}
        </div>
        <div className="relative grid grid-cols-2 border-t border-border bg-surface md:grid-cols-4">
          {[
            [stats.watched.toLocaleString("fr-FR"), "films"],
            [String(stats.thisYear), `en ${new Date().getFullYear()}`],
            [stats.avgRating != null ? `${stats.avgRating.toFixed(1).replace(".", ",")}★` : "—", "note moyenne"],
            [String(owned.length), "dans sa collection"],
          ].map(([v, l]) => (
            <div key={l} className="border-border p-4 [&:not(:last-child)]:border-r">
              <div className="font-display text-3xl text-accent">{v}</div>
              <div className="text-xs text-muted">{l}</div>
            </div>
          ))}
        </div>
      </header>

      {favorites.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl md:text-2xl">Coups de cœur</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {favorites.slice(0, 12).map((f) => <FilmCard key={f.id} film={f} />)}
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          <section>
            <h2 className="mb-4 text-xl md:text-2xl">Critiques Dreams</h2>
            {critiques.length ? (
              <div className="space-y-3">
                {critiques.map((c) => (
                  <Link key={c.id} href={`/critiques/${c.id}`} className="group flex gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-accent/60">
                    {c.poster && <img src={poster(c.poster, "w185")!} alt="" className="aspect-[2/3] w-16 shrink-0 rounded-md object-cover" />}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><TextKind kind="critique" />{c.visibility === "prive" && <span className="text-xs text-muted">🔒 privée</span>}</div>
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
            <h2 className="mb-4 text-xl md:text-2xl">Activité récente</h2>
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
          {owned.length > 0 && (
            <section>
              <h3 className="mb-3 text-xl">Sa collection</h3>
              <div className="grid grid-cols-3 gap-3">
                {owned.slice(0, 6).map((o) => (
                  <DvdCase
                    key={o.id}
                    compact
                    film={{ id: o.id, href: `/film/${o.id}`, title: o.title_fr ?? o.name, year: o.year, director: o.director, runtime: o.runtime, image: backdrop(o.backdrop_path), cover: o.cover || poster(o.poster_path, "w342"), format: o.format, caseType: o.caseType }}
                  />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
