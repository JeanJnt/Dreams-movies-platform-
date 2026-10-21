/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { LibraryTabs } from "@/components/LibraryTabs";
import { findPerson, profileUrl, topPeople, type Role } from "@/lib/people";

export const metadata: Metadata = { title: "Cinéastes et acteurs" };
export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const [directors, actors] = await Promise.all([withPhotos(await topPeople("director", 18), "director"), withPhotos(await topPeople("actor", 18), "actor")]);

  return (
    <div className="space-y-12 pt-2 md:pt-8">
      <LibraryTabs />
      <div>
        <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Cinéastes &amp; acteurs</h1>
        <p className="mt-3 max-w-2xl text-muted">Les personnes que tu as le plus suivies, d&apos;après tes films vus.</p>
      </div>
      <Ranking title="Mes cinéastes" people={directors} role="director" />
      <Ranking title="Mes acteurs & actrices" people={actors} role="actor" />
    </div>
  );
}

// Les photos viennent de TMDB (gardées en cache un mois).
async function withPhotos(people: Awaited<ReturnType<typeof topPeople>>, role: Role) {
  return Promise.all(people.map(async (p) => ({ ...p, person: await findPerson(p.name, role).catch(() => null) })));
}

function Ranking({ title, people, role }: { title: string; people: Awaited<ReturnType<typeof withPhotos>>; role: Role }) {
  return (
    <section>
      <h2 className="mb-5 text-3xl md:text-4xl">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {people.map((p, i) => {
          const photo = profileUrl(p.person?.profile_path ?? null);
          const href = p.person ? `/personne/${p.person.id}` : `/personne?nom=${encodeURIComponent(p.name)}&role=${role}`;
          return (
            <Link key={p.name} href={href} className="group">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-2">
                {photo && <img src={photo} alt={p.name} loading="lazy" className="size-full object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0" />}
                <span className="font-display absolute top-2 left-3 text-4xl text-white drop-shadow-[0_2px_6px_#000a]">{i + 1}</span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10 text-white">
                  <p className="font-display text-lg leading-tight">{p.name}</p>
                  <p className="text-xs text-white/75">
                    {p.seen} films{p.avgRating != null && ` · ${p.avgRating}★`}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
