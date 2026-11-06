/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Stars } from "@/components/Stars";
import { PageHeader } from "@/components/ui/PageHeader";
import { allCritiques, readingTime } from "@/lib/critiques";
import { formatLongDate } from "@/lib/format";
import { sharedCritiques } from "@/lib/social";
import { backdrop, poster } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Mes critiques" };
export const dynamic = "force-dynamic";

/*
 * Les critiques, composées comme une revue de cinéma :
 *   la une (la dernière critique publiée) en plan large, titre en Bodoni ;
 *   le sommaire des autres textes, ligne par ligne ;
 *   « sur la table » : les brouillons ; « chez les amis » : les textes des autres membres.
 */
export default async function CritiquesPage() {
  const [critiques, others] = await Promise.all([allCritiques(), sharedCritiques({ excludeMine: true, limit: 30 })]);
  const published = critiques.filter((c) => c.status === "published");
  const [featured, ...rest] = published;
  const drafts = critiques.filter((c) => c.status === "draft");

  return (
    <div className="space-y-20">
      <PageHeader eyebrow="Journal" number={`${published.length} publiée${published.length > 1 ? "s" : ""}, ${drafts.length} en cours`} title="Mes critiques" actions={<Link href="/films" className="btn btn-primary">Écrire sur un film</Link>} />

      {!critiques.length && (
        <div className="card px-6 py-16 text-center">
          <p className="font-display text-3xl">Pas encore de critique</p>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">Ouvrez la fiche d&apos;un film de votre journal et choisissez « Écrire une critique » : titre, chapeau, intertitres, citations.</p>
          <Link href="/films" className="btn btn-primary mt-6">
            Choisir un film
          </Link>
        </div>
      )}

      {/* la une */}
      {featured && (
        <Link href={`/critiques/${featured.id}`} className="group full-bleed relative block" aria-label={`À la une : ${featured.title || "Sans titre"}`}>
          <div className="relative mx-auto max-w-[1680px] overflow-hidden">
            {featured.backdropPath ? <img src={backdrop(featured.backdropPath)!} alt="" className="aspect-[2.39/1] max-h-[74svh] min-h-[24rem] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.23,1,.32,1)] group-hover:scale-[1.02]" /> : <div className="aspect-[2.39/1] min-h-[24rem] bg-surface-2" />}
            <div className="absolute inset-0 bg-[linear-gradient(0deg,#000_0%,rgb(0_0_0/0.6)_40%,transparent_75%)]" />
            <div className="absolute inset-x-0 bottom-0 px-[var(--gutter)] pb-10 md:pb-14">
              <p className="wide text-muted">À la une · {featured.filmTitleFr ?? featured.filmName}, {featured.year}</p>
              <h2 className="mt-4 max-w-4xl text-[clamp(2.4rem,5.6vw,5.4rem)] leading-[0.95]">{featured.title || "Sans titre"}</h2>
              {featured.lede && <p className="serif mt-4 line-clamp-2 max-w-2xl text-[1.35rem] text-[var(--text-2)]">{featured.lede}</p>}
              <p className="mt-5 flex items-center gap-3 text-[14px] text-muted">
                {featured.rating != null && <Stars rating={featured.rating} />}
                <span>
                  {formatLongDate(featured.updatedAt.slice(0, 10))} · {readingTime(featured.body)} min de lecture
                </span>
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* le sommaire */}
      {rest.length > 0 && (
        <section aria-labelledby="sommaire" data-reveal>
          <h2 id="sommaire" className="text-[2rem] leading-none md:text-[2.6rem]">
            Au sommaire
          </h2>
          <ol className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {rest.map((c) => (
              <li key={c.id}>
                <Row href={`/critiques/${c.id}`} c={c} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {drafts.length > 0 && (
        <section aria-labelledby="table" data-reveal>
          <h2 id="table" className="text-[2rem] leading-none md:text-[2.6rem]">
            Sur la table
          </h2>
          <p className="mt-2 text-[14.5px] text-muted">Vos brouillons, enregistrés au fil de l&apos;écriture.</p>
          <ul className="mt-6 grid gap-2 md:grid-cols-2">
            {drafts.map((c) => (
              <li key={c.id}>
                <Link href={`/film/${c.filmId}/critique`} className="ticket">
                  {c.posterPath && <img src={poster(c.posterPath, "w185")!} alt="" className="h-12 w-8 shrink-0 rounded-[2px] object-cover" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{c.title || "Sans titre"}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {c.filmTitleFr ?? c.filmName} · modifié le {formatLongDate(c.updatedAt.slice(0, 10))}
                    </span>
                  </span>
                  <span className="shrink-0 pr-2 text-[13px] text-muted">Reprendre</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="bande" data-reveal>
          <h2 id="bande" className="text-[2rem] leading-none md:text-[2.6rem]">
            Chez les amis
          </h2>
          <p className="mt-2 text-[14.5px] text-muted">Les critiques que les autres membres ont partagées.</p>
          <div className="mt-8 grid gap-x-10 gap-y-2 md:grid-cols-2">
            {others.map((o) => (
              <Link key={o.id} href={`/critiques/${o.id}`} className="group grid grid-cols-[4rem_minmax(0,1fr)] gap-5 border-t border-[var(--line)] py-5">
                <span className="poster aspect-[2/3] w-full">{o.poster && <img src={poster(o.poster, "w185")!} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] text-muted">
                    <span className="text-foreground">{o.author}</span> sur {o.filmTitle}, {o.year}
                  </span>
                  <span className="mt-1 block font-display text-[1.6rem] leading-tight transition-colors group-hover:text-white">{o.title || o.filmTitle}</span>
                  {o.lede && <span className="mt-1 line-clamp-2 block text-[14px] text-[var(--text-2)]">{o.lede}</span>}
                  <span className="mt-2 flex items-center gap-2 text-[13px] text-muted">
                    {o.rating != null && <Stars rating={o.rating} />}
                    {readingTime(o.body)} min
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ c, href }: { c: Awaited<ReturnType<typeof allCritiques>>[number]; href: string }) {
  return (
    <Link href={href} className="group grid grid-cols-[3.4rem_minmax(0,1fr)] items-center gap-5 py-5 md:grid-cols-[4.2rem_minmax(0,1fr)_14rem] md:gap-8">
      <span className="poster aspect-[2/3] w-full">{c.posterPath && <img src={poster(c.posterPath, "w185")!} alt="" loading="lazy" className="size-full object-cover" />}</span>
      <span className="min-w-0">
        <span className="block text-[13px] text-muted">
          {c.filmTitleFr ?? c.filmName}, {c.year}
        </span>
        <span className="mt-1 block font-display text-[1.6rem] leading-tight md:text-[2.1rem]">{c.title || "Sans titre"}</span>
        {c.lede && <span className="mt-1 line-clamp-2 block max-w-[62ch] text-[14.5px] text-[var(--text-2)]">{c.lede}</span>}
      </span>
      <span className="hidden text-right text-[13.5px] text-muted md:block">
        {c.rating != null && <Stars rating={c.rating} className="mb-1 block" />}
        {formatLongDate(c.updatedAt.slice(0, 10))}
        <br />
        {readingTime(c.body)} min de lecture
      </span>
    </Link>
  );
}
