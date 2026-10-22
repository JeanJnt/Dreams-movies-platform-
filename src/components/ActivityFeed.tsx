/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Activity } from "@/lib/social";
import { poster } from "@/lib/tmdb";
import { Stars } from "./Stars";

const when = (iso: string) => {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso.replace(" ", "T") + (iso.includes("T") || iso.endsWith("Z") ? "" : "Z"));
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: days > 300 ? "numeric" : undefined });
};

// Badge qui distingue clairement les deux types de textes.
export function TextKind({ kind }: { kind: "critique" | "review" }) {
  return kind === "critique" ? (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wider text-on-accent uppercase">Critique Dreams</span>
  ) : (
    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wider text-muted uppercase">Review Letterboxd</span>
  );
}

function Line({ a }: { a: Activity }) {
  const who = <Link href={`/membre/${a.userId}`} className="font-medium hover:text-accent">{a.author}</Link>;
  const film = <Link href={`/film/${a.filmId}`} className="font-display hover:text-accent">{a.filmTitle}</Link>;
  switch (a.kind) {
    case "vu":
      return <>{who} {a.rewatch ? "a revu" : "a vu"} {film}</>;
    case "critique":
      return <>{who} a publié une critique de {film}</>;
    case "review":
      return <>{who} a écrit une review de {film}</>;
    case "collection":
      return <>{who} a ajouté {film} à sa collection{a.extra ? ` (${a.extra})` : ""}</>;
    case "media":
      return <>{who} a partagé {a.extra === "video" ? "une vidéo" : a.extra === "youtube" ? "une vidéo YouTube" : "une photo"} sur {film}</>;
  }
}

export function ActivityFeed({ items, compact = false }: { items: Activity[]; compact?: boolean }) {
  if (!items.length) return <p className="text-sm text-muted">Pas encore d&apos;activité.</p>;
  return (
    <ul className="space-y-3">
      {items.map((a, i) => (
        <li key={`${a.kind}-${a.refId ?? a.filmId}-${a.userId}-${i}`} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
          <Link href={`/film/${a.filmId}`} className="w-12 shrink-0 md:w-14">
            <div className="aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
              {a.poster && <img src={poster(a.poster, "w185")!} alt="" loading="lazy" className="size-full object-cover" />}
            </div>
          </Link>
          <div className="min-w-0 flex-1 text-sm">
            <p className="leading-snug">
              <Line a={a} />
              {a.year && <span className="text-muted"> ({a.year})</span>}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {a.rating != null && <Stars rating={a.rating} />}
              {a.liked && a.kind === "vu" && <span className="text-heart">♥</span>}
              {(a.kind === "critique" || a.kind === "review") && <TextKind kind={a.kind} />}
              <span>{when(a.date)}</span>
            </div>
            {!compact && a.kind === "critique" && a.refId && (
              <Link href={`/critiques/${a.refId}`} className="mt-2 block rounded-xl bg-surface-2 p-3 hover:bg-accent-soft">
                <span className="font-display block text-lg leading-tight">{a.text}</span>
                {a.extra && a.extra !== a.text && <span className="mt-1 line-clamp-2 block text-xs text-muted">{a.extra}</span>}
                <span className="mt-1 block text-xs text-accent">Lire la critique</span>
              </Link>
            )}
            {!compact && a.kind === "review" && a.text && <p className="mt-2 line-clamp-3 text-sm text-foreground/80 italic">« {a.text} »</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
