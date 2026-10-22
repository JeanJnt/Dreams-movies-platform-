/* eslint-disable @next/next/no-img-element */
import { findSoundtrack } from "@/lib/deezer";
import { tmdb } from "@/lib/tmdb";

// Encadré « Bande originale » de la fiche film : pochette, lien Deezer et lecteur intégré (dépliable).
export async function Soundtrack({ titles, tmdbId }: { titles: (string | null)[]; tmdbId?: number | null }) {
  // Les compositeurs du film, pour ne pas confondre avec la BO d'un autre film du même titre
  const composers = tmdbId
    ? await tmdb<{ crew: { name: string; job: string }[] }>(`/movie/${tmdbId}/credits`, {}, 2, { next: { revalidate: 60 * 60 * 24 * 7 } })
        .then((c) => [...new Set(c.crew.filter((p) => /composer|music/i.test(p.job)).map((p) => p.name))])
        .catch(() => [])
    : [];
  const ost = await findSoundtrack(titles, composers);
  const search = `https://www.deezer.com/search/${encodeURIComponent(`${titles.find(Boolean) ?? ""} soundtrack`)}`;

  if (!ost) {
    return (
      <a href={search} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 text-sm transition hover:border-accent/60">
        <span className="font-display">Chercher la bande originale</span>
        <span className="text-muted">Deezer</span>
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-lg">Bande originale</h3>
      <a href={ost.link} target="_blank" rel="noreferrer" className="group flex gap-3">
        <img src={ost.cover} alt="" className="size-16 shrink-0 rounded-md shadow-lg shadow-black/30 transition group-hover:scale-105" />
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm leading-snug group-hover:text-accent">{ost.title}</span>
          <span className="mt-0.5 block text-xs text-muted">{ost.artist} · {ost.tracks} titres</span>
          <span className="mt-1 block text-xs text-accent">Écouter sur Deezer</span>
        </span>
      </a>
      <details className="mt-3 group/player">
        <summary className="cursor-pointer list-none text-xs text-muted hover:text-foreground">▶ Écouter ici</summary>
        <iframe
          title={`Lecteur Deezer : ${ost.title}`}
          src={`https://widget.deezer.com/widget/auto/album/${ost.id}?tracklist=true`}
          className="mt-3 h-80 w-full rounded-xl"
          allow="encrypted-media; clipboard-write"
          loading="lazy"
        />
      </details>
    </div>
  );
}
