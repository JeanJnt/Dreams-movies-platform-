/* eslint-disable @next/next/no-img-element */
import { currentUser } from "@/lib/auth";
import { findSoundtrack } from "@/lib/deezer";
import { musicPlatformLabel, musicSearchUrl } from "@/lib/music";
import { tmdb } from "@/lib/tmdb";

// Encadré « Bande originale » de la fiche film : pochette, lien vers la plateforme de musique du membre (Deezer ou
// Spotify, choisie dans Mon compte) et lecteur Deezer intégré (dépliable).
export async function Soundtrack({ titles, tmdbId }: { titles: (string | null)[]; tmdbId?: number | null }) {
  const platform = (await currentUser())?.musicPlatform ?? "deezer";
  const name = musicPlatformLabel(platform);
  // Les compositeurs du film, pour ne pas confondre avec la BO d'un autre film du même titre
  const composers = tmdbId
    ? await tmdb<{ crew: { name: string; job: string }[] }>(`/movie/${tmdbId}/credits`, {}, 2, { next: { revalidate: 60 * 60 * 24 * 7 } })
        .then((c) => [...new Set(c.crew.filter((p) => /composer|music/i.test(p.job)).map((p) => p.name))])
        .catch(() => [])
    : [];
  const ost = await findSoundtrack(titles, composers);

  if (!ost) {
    return (
      <a
        href={musicSearchUrl(platform, `${titles.find(Boolean) ?? ""} soundtrack`)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between card p-6 text-sm transition hover:border-accent/60"
      >
        <span className="font-display">Chercher la bande originale</span>
        <span className="text-muted">{name}</span>
      </a>
    );
  }

  // L'album est trouvé sur Deezer. Sur Spotify (pas d'API sans compte), une recherche du titre exact et du compositeur.
  const link = platform === "deezer" ? ost.link : musicSearchUrl(platform, `${ost.title} ${ost.artist}`);

  return (
    <div className="card p-6">
      <h3 className="mb-3 text-lg">Bande originale</h3>
      <a href={link} target="_blank" rel="noreferrer" className="group flex gap-3">
        <img src={ost.cover} alt="" className="size-16 shrink-0 rounded-md shadow-lg shadow-black/30 transition group-hover:scale-105" />
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm leading-snug group-hover:text-accent">{ost.title}</span>
          <span className="mt-0.5 block text-xs text-muted">{ost.artist} · {ost.tracks} titres</span>
          <span className="mt-1 block text-xs text-accent">Écouter sur {name}</span>
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
