/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { ShareCard } from "@/components/ShareCard";
import { Stars } from "@/components/Stars";
import { getCritique, readingTime } from "@/lib/critiques";
import { formatLongDate } from "@/lib/format";
import { backdrop } from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCritique(Number((await params).id));
  return { title: c ? c.title || c.filmName : "Critique introuvable", description: c?.lede };
}

export default async function CritiquePage({ params }: Props) {
  const c = await getCritique(Number((await params).id));
  if (!c) notFound();
  const filmTitle = c.filmTitleFr ?? c.filmName;

  return (
    <article className="pt-2 md:pt-8">
      {c.backdropPath && (
        <div className="relative -mx-4 md:mx-0">
          <img src={backdrop(c.backdropPath)!} alt="" className="aspect-[16/9] w-full object-cover md:aspect-[21/9] md:rounded-xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent md:rounded-xl" />
        </div>
      )}

      <div className="relative mx-auto -mt-16 max-w-2xl md:-mt-28">
        <Link href={`/film/${c.filmId}`} className="text-xs uppercase tracking-[0.2em] text-accent hover:underline">
          {filmTitle} · {c.year}{c.directors.length ? ` · ${c.directors.join(", ")}` : ""}
        </Link>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] md:text-6xl">{c.title || filmTitle}</h1>
        {c.lede && <p className="mt-5 text-xl leading-relaxed text-foreground/80">{c.lede}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-border py-3 text-sm text-muted">
          {c.rating != null && <Stars rating={c.rating} className="text-lg" />}
          <span>{formatLongDate(c.updatedAt.slice(0, 10))}</span>
          <span>·</span>
          <span>{readingTime(c.body)} min de lecture</span>
          {c.status === "draft" && <span className="rounded bg-surface-2 px-1.5 text-xs">brouillon</span>}
          <Link href={`/film/${c.filmId}/critique`} className="ml-auto hover:text-accent">Modifier</Link>
        </div>

        <div className="mt-8">
          <Markdown dropCap>{c.body}</Markdown>
        </div>

        <div className="mt-12">
          <ShareCard id={c.id} title={c.title || filmTitle} />
        </div>
      </div>
    </article>
  );
}
