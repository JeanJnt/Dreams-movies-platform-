/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { LibraryTabs } from "@/components/LibraryTabs";
import { currentUser } from "@/lib/auth";
import { allLists } from "@/lib/queries";
import { refLists } from "@/lib/ref-lists";
import { visibleLists, type UserList } from "@/lib/user-lists";
import { poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Listes" };
export const dynamic = "force-dynamic";

// Affiches qui se chevauchent, comme sur Letterboxd
function Stack({ posters }: { posters: string[] }) {
  return (
    <div className="flex">
      {posters.map((p, i) => (
        <img
          key={p}
          src={poster(p, "w185")!}
          alt=""
          loading="lazy"
          className="aspect-[2/3] w-1/4 rounded-md object-cover shadow-lg shadow-black/60 ring-1 ring-white/10"
          style={{ marginLeft: i ? "-6%" : 0, zIndex: 4 - i }}
        />
      ))}
    </div>
  );
}

export default async function ListsPage() {
  const [lists, references, me, mine] = await Promise.all([allLists(), refLists(), currentUser(), visibleLists()]);
  return (
    <div className="space-y-10 pt-2 md:pt-8">
      <LibraryTabs />
      <h1 className="page-title font-display text-5xl leading-[0.95] md:text-7xl">Listes</h1>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-xl md:text-2xl">Mes listes</h2>
          <Link href="/listes/perso/nouvelle" className="rounded-full bg-accent px-4 py-1.5 text-sm text-on-accent">Nouvelle liste</Link>
        </div>
        {mine.mine.length ? (
          <UserListGrid lists={mine.mine} />
        ) : (
          <p className="text-sm text-muted">Aucune liste pour l&apos;instant.</p>
        )}
      </section>

      {mine.others.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl md:text-2xl">Listes des membres</h2>
          <UserListGrid lists={mine.others} showAuthor />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-xl md:text-2xl">Listes de référence</h2>
          {me?.isAdmin && <Link href="/admin" className="text-sm text-muted hover:text-accent">+ Ajouter une liste</Link>}
        </div>
        {references.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {references.map((l) => {
              const pct = l.total ? Math.round((l.seen / l.total) * 100) : 0;
              return (
                <Link key={l.slug} href={`/listes/ref/${l.slug}`} className="group rounded-xl border border-border bg-surface p-3 transition hover:border-accent/50">
                  <Stack posters={l.posters} />
                  <h3 className="mt-3 font-medium group-hover:text-accent">{l.name}</h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tabular-nums">{l.seen} / {l.total} vus</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Aucune liste de référence pour l&apos;instant{me?.isAdmin ? " : ajoute Sight and Sound, le Top Letterboxd… depuis l'Administration." : "."}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl md:text-2xl">Mes listes Letterboxd</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <Link key={l.slug} href={`/listes/${l.slug}`} className="group rounded-xl border border-border bg-surface p-3 transition hover:border-accent/50">
              <Stack posters={l.posters} />
              <h3 className="mt-3 font-medium group-hover:text-accent">{l.name}</h3>
              <p className="text-sm text-muted">{l.count} films</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function UserListGrid({ lists, showAuthor = false }: { lists: UserList[]; showAuthor?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((l) => (
        <Link key={l.id} href={`/listes/perso/${l.id}`} className="group rounded-xl border border-border bg-surface p-3 transition hover:border-accent/50">
          {l.posters.length > 0 ? <Stack posters={l.posters} /> : <div className="aspect-[4/1.5] rounded-md bg-surface-2" />}
          <h3 className="mt-3 font-medium group-hover:text-accent">{l.name}</h3>
          <p className="text-sm text-muted">
            {showAuthor && `@${l.author} · `}
            {l.count} films{l.visibility === "prive" ? " · privée" : ""}
          </p>
        </Link>
      ))}
    </div>
  );
}
