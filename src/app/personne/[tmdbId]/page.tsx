/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Stars } from "@/components/Stars";
import { formatLongDate } from "@/lib/format";
import { personDetail, profileUrl, type PersonFilm } from "@/lib/people";
import { poster } from "@/lib/tmdb";

type Props = { params: Promise<{ tmdbId: string }> };

async function load(params: Props["params"]) {
  const id = Number((await params).tmdbId);
  if (!Number.isInteger(id)) return null;
  return personDetail(id).catch(() => null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load(params);
  return { title: p?.name ?? "Personne introuvable" };
}

const age = (birth: string, end?: string | null) => {
  const b = new Date(birth), e = end ? new Date(end) : new Date();
  return e.getFullYear() - b.getFullYear() - (e < new Date(e.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
};

export default async function PersonPage({ params }: Props) {
  const p = await load(params);
  if (!p) notFound();
  const photo = profileUrl(p.profilePath, "h632");
  const pct = p.stats.total ? Math.round((p.stats.seen / p.stats.total) * 100) : 0;
  // Un cinéaste : la réalisation d'abord. Un acteur : les rôles d'abord.
  const sections = p.department === "Directing" || p.directed.length >= 3
    ? [["Réalisation", p.directed], ["Devant la caméra", p.acted]] as const
    : [["Filmographie", p.acted], ["Réalisation", p.directed]] as const;

  return (
    <div className="space-y-12 pt-2 md:pt-8">
      <header className="grid gap-6 md:grid-cols-[260px_1fr] md:gap-10">
        <div className="mx-auto w-44 md:w-full">
          <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-surface-2 shadow-2xl shadow-black/40">
            {photo && <img src={photo} alt={p.name} className="size-full object-cover" />}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs tracking-[0.3em] text-muted uppercase">
            {p.department === "Directing" ? "Cinéaste" : p.department === "Acting" ? "Acteur·rice" : p.department}
          </p>
          <h1 className="page-title mt-2 text-5xl leading-[0.95] md:text-7xl">{p.name}</h1>
          <p className="mt-4 text-sm text-muted">
            {p.birthday && <>Né·e le {formatLongDate(p.birthday)}{!p.deathday && ` (${age(p.birthday)} ans)`}</>}
            {p.placeOfBirth && <> · {p.placeOfBirth}</>}
            {p.deathday && p.birthday && <> · mort·e le {formatLongDate(p.deathday)} ({age(p.birthday, p.deathday)} ans)</>}
          </p>

          <div className="mt-6 grid max-w-lg grid-cols-3 overflow-hidden rounded-2xl border border-border bg-surface">
            <Stat value={String(p.stats.seen)} label="films vus" />
            <Stat value={`${pct} %`} label="de sa filmographie" />
            <Stat value={p.stats.avgRating != null ? `${p.stats.avgRating}★` : "—"} label="ma note moyenne" />
          </div>

          {p.biography && (
            <details className="group mt-6 max-w-2xl">
              <summary className="cursor-pointer list-none">
                <p className="line-clamp-4 leading-relaxed text-foreground/85 group-open:line-clamp-none">{p.biography}</p>
                <span className="mt-1 inline-block text-sm text-accent group-open:hidden">Lire la suite</span>
              </summary>
            </details>
          )}
        </div>
      </header>

      {sections.map(([title, films]) =>
        films.length ? (
          <section key={title}>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl md:text-2xl">{title}</h2>
              <span className="text-sm text-muted">{films.filter((f) => f.seen).length} / {films.length} vus</span>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
              {films.map((f) => <PersonFilmCard key={`${title}-${f.tmdbId}-${f.role}`} film={f} showRole={title !== "Réalisation"} />)}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-border p-4 last:border-r-0">
      <div className="font-display text-3xl leading-none text-accent">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

function PersonFilmCard({ film: f, showRole }: { film: PersonFilm; showRole: boolean }) {
  const src = poster(f.posterPath, "w342");
  return (
    <Link href={f.href} className={`group block ${f.seen ? "" : "opacity-55 hover:opacity-100"}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 ring-1 ring-black/10">
        {src ? <img src={src} alt={f.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{f.title}</div>}
        {f.seen && <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] text-on-accent">✓</span>}
        {!f.seen && f.inWatchlist && <span className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-1.5 text-[10px] text-white">à voir</span>}
      </div>
      <p className="mt-1.5 line-clamp-1 text-xs group-hover:text-accent">{f.title}</p>
      <p className="flex items-center gap-1 text-[11px] text-muted">
        {f.year}
        {f.myRating != null && <Stars rating={f.myRating} className="ml-auto" />}
      </p>
      {showRole && f.role && <p className="line-clamp-1 text-[11px] text-muted italic">{f.role}</p>}
    </Link>
  );
}
