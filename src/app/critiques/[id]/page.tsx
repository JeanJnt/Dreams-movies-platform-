/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TextKind } from "@/components/ActivityFeed";
import { Markdown } from "@/components/Markdown";
import { ShareCard } from "@/components/ShareCard";
import { Stars } from "@/components/Stars";
import { readingTime } from "@/lib/critiques";
import { formatLongDate } from "@/lib/format";
import { readableCritique } from "@/lib/social";
import { backdrop } from "@/lib/tmdb";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await readableCritique(Number((await params).id));
  return { title: c ? c.title || c.filmTitle : "Critique introuvable" };
}

// Lecture d'une critique Dreams : la mienne (même en brouillon), ou celle d'un membre qui l'a partagée.
export default async function CritiquePage({ params }: Props) {
  const c = await readableCritique(Number((await params).id));
  if (!c) notFound();

  return (
    <article className="pt-2 md:pt-8">
      {c.backdrop && (
        <div className="relative -mx-4 md:mx-0">
          <img src={backdrop(c.backdrop)!} alt="" className="aspect-[16/9] w-full object-cover md:aspect-[21/9] md:rounded-xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent md:rounded-xl" />
        </div>
      )}

      <div className="relative mx-auto -mt-16 max-w-2xl md:-mt-28">
        <div className="flex flex-wrap items-center gap-3">
          <TextKind kind="critique" />
          <Link href={`/film/${c.filmId}`} className="text-xs uppercase tracking-[0.2em] text-accent hover:underline">
            {c.filmTitle} · {c.year}{c.directors.length ? ` · ${c.directors.join(", ")}` : ""}
          </Link>
        </div>
        <h1 className="mt-3 text-5xl leading-[1.05] md:text-6xl">{c.title || c.filmTitle}</h1>
        {c.lede && <p className="mt-5 text-xl leading-relaxed text-foreground/80">{c.lede}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-border py-3 text-sm text-muted">
          <Link href={`/membre/${c.userId}`} className="flex items-center gap-2 text-foreground hover:text-accent">
            <span className="font-display flex size-7 items-center justify-center rounded-full bg-accent text-xs text-on-accent">{c.author.slice(0, 1).toUpperCase()}</span>
            {c.author}
          </Link>
          {c.rating != null && <Stars rating={c.rating} className="text-lg" />}
          <span>{formatLongDate(c.updatedAt.slice(0, 10))}</span>
          <span>·</span>
          <span>{readingTime(c.body)} min de lecture</span>
          {c.status === "draft" && <span className="rounded bg-surface-2 px-1.5 text-xs">brouillon</span>}
          {c.mine && c.visibility === "prive" && <span className="text-xs">privée</span>}
          {c.mine && <Link href={`/film/${c.filmId}/critique`} className="ml-auto hover:text-accent">Modifier</Link>}
        </div>

        <div className="mt-8">
          <Markdown dropCap>{c.body}</Markdown>
        </div>

        {c.mine && (
          <div className="mt-12">
            <ShareCard id={c.id} title={c.title || c.filmTitle} />
          </div>
        )}
      </div>
    </article>
  );
}
