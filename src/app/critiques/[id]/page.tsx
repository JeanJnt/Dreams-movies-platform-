import type { Metadata } from "next";
import { Projection } from "@/components/fx/Projection";
import { ReadingProgress } from "@/components/motion/ReadingProgress";
import { TitleWords } from "@/components/ui/PageHeader";
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
    <article id="lecture" className={c.backdrop ? "" : "pt-10 md:pt-20"}>
      <ReadingProgress target="#lecture" />
      {c.backdrop && (
        <div className="relative ml-[calc(50%-50vw)] w-screen md:-mt-[4.25rem]">
          <Projection src={backdrop(c.backdrop)!} className="h-[42svh] md:h-[70svh] md:max-h-[44rem]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/80 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      )}

      <div className={`relative mx-auto max-w-2xl ${c.backdrop ? "-mt-24 md:-mt-48" : ""}`}>
        <div className="flex flex-wrap items-center gap-3">
          <TextKind kind="critique" />
          <Link href={`/film/${c.filmId}`} className="eyebrow !text-accent link-draw">
            {c.filmTitle} · {c.year}{c.directors.length ? ` · ${c.directors.join(", ")}` : ""}
          </Link>
        </div>
        <h1 className="mt-5 font-display text-[clamp(2.8rem,7vw,5.25rem)] leading-[0.95] text-balance">
          <TitleWords text={c.title || c.filmTitle} />
        </h1>
        {c.lede && <p className="mt-6 font-display text-[1.4rem] leading-snug text-foreground/80 italic md:text-[1.65rem]">{c.lede}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-y border-border py-4 text-sm text-muted">
          <Link href={`/membre/${c.userId}`} className="flex items-center gap-2 text-foreground hover:text-accent">
            <span className="font-display flex size-7 items-center justify-center rounded-full bg-accent text-xs text-on-accent">{c.author.slice(0, 1).toUpperCase()}</span>
            {c.author}
          </Link>
          {c.rating != null && <Stars rating={c.rating} className="text-lg" />}
          <span className="font-mono text-xs">{formatLongDate(c.updatedAt.slice(0, 10))}</span>
          <span>·</span>
          <span className="font-mono text-xs">{readingTime(c.body)} min de lecture</span>
          {c.status === "draft" && <span className="rounded bg-surface-2 px-1.5 text-xs">brouillon</span>}
          {c.mine && c.visibility === "prive" && <span className="text-xs">privée</span>}
          {c.mine && <Link href={`/film/${c.filmId}/critique`} className="ml-auto hover:text-accent">Modifier</Link>}
        </div>

        <div className="mt-10">
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
