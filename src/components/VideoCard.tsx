/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { Video } from "@/lib/sources";

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

// La vidéo ne se charge qu'au clic : la page reste légère et YouTube ne piste rien avant.
export function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="size-full"
          />
        ) : (
          <button onClick={() => setPlaying(true)} className="group size-full" aria-label={`Lire : ${video.title}`}>
            <img src={video.thumbnail} alt="" loading="lazy" className="size-full object-cover transition group-hover:brightness-75" />
            <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-black/70 text-lg text-white transition group-hover:scale-110 group-hover:bg-accent group-hover:text-on-accent">▶</span>
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 text-xs text-white">{formatDuration(video.duration)}</span>
          </button>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-snug">{video.title}</p>
      <p className="text-xs text-muted">{video.channel}</p>
    </div>
  );
}
