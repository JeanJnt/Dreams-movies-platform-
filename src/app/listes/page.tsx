/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { currentUser } from "@/lib/auth";
import { allLists } from "@/lib/queries";
import { refLists } from "@/lib/ref-lists";
import { poster } from "@/lib/tmdb";
import { visibleLists, type UserList } from "@/lib/user-lists";

export const metadata: Metadata = { title: "Listes" };
export const dynamic = "force-dynamic";

/*
 * Les listes, présentées comme des coffrets : les affiches s'ouvrent en éventail, le nom en Bodoni dessous.
 * Trois rayons distincts : mes listes (créées dans Dreams), celles des membres, les listes de référence
 * (avec ma progression, en argent), et les listes importées de Letterboxd.
 */
function Fan({ posters }: { posters: string[] }) {
  const p = posters.slice(0, 5);
  const mid = (p.length - 1) / 2;
  return (
    <div className="relative mx-auto aspect-[5/3] w-full" aria-hidden>
      {p.length === 0 && <div className="absolute inset-x-[30%] inset-y-0 rounded-[3px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--line-2)]" />}
      {p.map((src, i) => {
        const k = i - mid;
        return (
          <img
            key={src}
            src={poster(src, "w185")!}
            alt=""
            loading="lazy"
            className="fan-card absolute bottom-0 left-1/2 aspect-[2/3] w-[34%] rounded-[3px] object-cover shadow-[0_18px_30px_-14px_#000] ring-1 ring-white/10"
            style={{ "--k": k, zIndex: 10 - Math.abs(Math.round(k)) } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

function ListTile({ href, posters, name, meta, progress }: { href: string; posters: string[]; name: string; meta: string; progress?: number }) {
  return (
    <Link href={href} className="group block">
      <div className="card px-6 pt-8 pb-4 transition-[box-shadow] duration-200 group-hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.09),0_0_0_1px_var(--line-2)]">
        <Fan posters={posters} />
      </div>
      <p className="mt-4 font-display text-[1.5rem] leading-tight">{name}</p>
      <p className="mt-1 text-[13.5px] text-muted">{meta}</p>
      {progress != null && (
        <div className="mt-3 h-px w-full bg-[var(--line-2)]" aria-hidden>
          <div className="h-px bg-[image:var(--marker)]" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Link>
  );
}

function Shelf({ id, title, kicker, action, children }: { id: string; title: string; kicker?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} data-reveal>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--line)] pt-6">
        <div>
          <h2 id={id} className="text-[2rem] leading-none md:text-[2.6rem]">
            {title}
          </h2>
          {kicker && <p className="mt-2 text-[14.5px] text-muted">{kicker}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const grid = "grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4";

export default async function ListsPage() {
  const [lists, references, me, mine] = await Promise.all([allLists(), refLists(), currentUser(), visibleLists()]);
  const userTiles = (ls: UserList[], author = false) =>
    ls.map((l) => <ListTile key={l.id} href={`/listes/perso/${l.id}`} posters={l.posters} name={l.name} meta={`${author ? `@${l.author} · ` : ""}${l.count} films${l.visibility === "prive" ? " · privée" : ""}`} />);

  return (
    <div className="space-y-20">
      <PageHeader eyebrow="Journal" number={`${mine.mine.length + lists.length} listes`} title="Listes" actions={<Link href="/listes/perso/nouvelle" className="btn btn-primary">Nouvelle liste</Link>} />

      <Shelf id="miennes" title="Mes listes" kicker="Créées dans Dreams, à partager ou à garder pour soi">
        {mine.mine.length ? (
          <div className={grid}>{userTiles(mine.mine)}</div>
        ) : (
          <div className="card px-6 py-12 text-center">
            <p className="font-display text-2xl">Aucune liste pour l&apos;instant</p>
            <p className="mt-2 text-[15px] text-muted">Rassemblez des films autour d&apos;une idée : un cinéaste, une saison, une soirée.</p>
            <Link href="/listes/perso/nouvelle" className="btn mt-6">
              Créer une liste
            </Link>
          </div>
        )}
      </Shelf>

      {mine.others.length > 0 && (
        <Shelf id="membres" title="Listes des membres" kicker="Ce que vos amis ont rassemblé">
          <div className={grid}>{userTiles(mine.others, true)}</div>
        </Shelf>
      )}

      <Shelf
        id="references"
        title="Listes de référence"
        kicker="Les grands classements, et où vous en êtes"
        action={
          me?.isAdmin ? (
            <Link href="/admin" className="btn btn-sm">
              Ajouter une liste
            </Link>
          ) : undefined
        }
      >
        {references.length ? (
          <div className={grid}>
            {references.map((l) => {
              const pct = l.total ? Math.round((l.seen / l.total) * 100) : 0;
              return <ListTile key={l.slug} href={`/listes/ref/${l.slug}`} posters={l.posters} name={l.name} meta={`${l.seen} sur ${l.total} vus · ${pct} %`} progress={pct} />;
            })}
          </div>
        ) : (
          <p className="text-[15px] text-muted">Aucune liste de référence pour l&apos;instant{me?.isAdmin ? " : ajoutez Sight and Sound ou le top Letterboxd depuis l'administration." : "."}</p>
        )}
      </Shelf>

      {lists.length > 0 && (
        <Shelf id="letterboxd" title="Importées de Letterboxd" kicker="Vos listes, telles qu'elles sont sur Letterboxd">
          <div className={grid}>
            {lists.map((l) => (
              <ListTile key={l.slug} href={`/listes/${l.slug}`} posters={l.posters} name={l.name} meta={`${l.count} films`} />
            ))}
          </div>
        </Shelf>
      )}
    </div>
  );
}
