/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { poster } from "@/lib/tmdb";
import { userListDetail } from "@/lib/user-lists";

export const metadata: Metadata = { title: "Liste partagée", robots: { index: false } };
export const dynamic = "force-dynamic";

// Une liste partagée par un lien secret : lisible sans compte, sans rien d'autre de Dreams.
export default async function SharedListPage({ params }: { params: Promise<{ token: string }> }) {
  const list = await userListDetail({ token: (await params).token.slice(0, 40) });
  if (!list) notFound();
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-10">
      <div>
        <p className="text-sm text-muted">
          Une liste de @{list.author} sur Dreams · {list.count} films
        </p>
        <h1 className="page-title mt-1 text-4xl leading-[0.95] md:text-6xl">{list.name}</h1>
        {list.description && <p className="mt-3 max-w-2xl text-muted">{list.description}</p>}
      </div>
      <ol className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
        {list.films.map((f, i) => (
          <li key={f.id}>
            <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
              {f.poster_path && <img src={poster(f.poster_path, "w342")!} alt="" loading="lazy" className="size-full object-cover" />}
              <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 text-[11px] text-white">{i + 1}</span>
            </div>
            <p className="mt-1.5 text-xs leading-tight">
              {f.title_fr ?? f.name} <span className="text-muted">{f.year}</span>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
