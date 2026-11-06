/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Bars, Columns } from "@/components/Charts";
import { Stars } from "@/components/Stars";
import { topPeople } from "@/lib/people";
import { byDecade, perMonth, perYear, ratingDistribution, records, statsOverview, timeline, topJson } from "@/lib/stats";
import { DiscStacks } from "@/components/dreams/DiscStacks";
import { poster } from "@/lib/tmdb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";

export const metadata: Metadata = { title: "Statistiques" };
export const dynamic = "force-dynamic";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const frise = vue === "frise";

  return (
    <div className="space-y-14">
      <PageHeader eyebrow={frise ? "Mes années de cinéma" : "Mes chiffres"} title={frise ? "Ma frise" : "Statistiques"}>
        <Tabs
          active={frise ? "/stats?vue=frise" : "/stats"}
          tabs={[
            { href: "/stats", label: "Chiffres" },
            { href: "/stats?vue=frise", label: "Frise" },
          ]}
        />
      </PageHeader>
      {frise ? <Timeline /> : <Numbers />}
    </div>
  );
}

async function Numbers() {
  const [o, months, ratings, decades, genres, countries, directors, actors, rec, years] = await Promise.all([
    statsOverview(), perMonth(24), ratingDistribution(), byDecade(), topJson("genres", 10), topJson("countries", 10),
    topPeople("director", 8), topPeople("actor", 8), records(), perYear(),
  ]);
  const trend = o.lastYear ? Math.round(((o.thisYear - o.lastYear) / o.lastYear) * 100) : null;
  const year = new Date().getFullYear();
  const favoriteRating = ratings.reduce((a, b) => (b.value > a.value ? b : a));
  const bestDecade = [...decades].filter((d) => d.value >= 10 && d.avg != null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];

  return (
    <div className="space-y-10">
      {/* Les grands chiffres */}
      <section className="grid grid-cols-2 border-t border-[var(--dm-line)] md:grid-cols-4">
        <Tile value={o.watched.toLocaleString("fr-FR")} label="films vus" />
        <Tile value={o.hours.toLocaleString("fr-FR")} label={`heures, soit ${o.days} jours`} />
        <Tile value={String(o.thisYear)} label={`films en ${year}`} note={trend != null ? `${trend >= 0 ? "+" : "−"}${Math.abs(trend)} % par rapport à la même période en ${year - 1}` : undefined} />
        <Tile value={o.avgRating != null ? `${o.avgRating.toFixed(2).replace(".", ",")}★` : "—"} label="note moyenne" />
        <Tile value={String(o.countries)} label="pays explorés" />
        <Tile value={String(o.directors)} label="cinéastes" />
        <Tile value={String(o.rewatches)} label="films revus" />
        <Tile value={`${favoriteRating.label}★`} label="votre note la plus fréquente" />
      </section>

      {years.length > 1 && (
        <Card title="Vos années de cinéma" subtitle="Chaque pile : les films vus dans l'année">
          <DiscStacks data={years} />
        </Card>
      )}

      <Card title="Films vus par mois" subtitle="Les 24 derniers mois, d'après votre journal">
        <Columns data={months} highlight={months.at(-1)?.key} />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Vos notes" subtitle={`Vous donnez le plus souvent ${favoriteRating.label} ★`}>
          <Columns data={ratings} unit="notes" height={150} />
        </Card>
        <Card title="Par décennie" subtitle={bestDecade ? `Votre décennie préférée : les années ${bestDecade.key} (${(bestDecade.avg ?? 0).toFixed(1).replace(".", ",")} ★ en moyenne)` : "Année de sortie des films vus"}>
          <Columns data={decades} height={150} />
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Genres" subtitle="Nombre de films et votre note moyenne">
          <Bars data={genres} />
        </Card>
        <Card title="Pays" subtitle="Nombre de films et votre note moyenne">
          <Bars data={countries} />
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <People title="Cinéastes les plus vus" people={directors} role="director" />
        <People title="Acteurs & actrices les plus vus" people={actors} role="actor" />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {rec.longest && <Record label="Le plus long" title={rec.longest.title} href={`/film/${rec.longest.id}`} value={`${Math.floor(Number(rec.longest.value) / 60)} h ${String(Number(rec.longest.value) % 60).padStart(2, "0")}`} />}
        {rec.oldest && <Record label="Le plus ancien" title={rec.oldest.title} href={`/film/${rec.oldest.id}`} value={rec.oldest.value} />}
        {rec.mostRewatched && <Record label="Le plus revu" title={rec.mostRewatched.title} href={`/film/${rec.mostRewatched.id}`} value={`${rec.mostRewatched.value} fois`} />}
      </section>
    </div>
  );
}

function Tile({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="border-b border-[var(--dm-line)] py-6 pr-4 md:py-8 [&:nth-child(even)]:border-l [&:nth-child(even)]:border-[var(--dm-line)] [&:nth-child(even)]:pl-5 md:[&:not(:nth-child(4n+1))]:border-l md:[&:not(:nth-child(4n+1))]:border-[var(--dm-line)] md:[&:not(:nth-child(4n+1))]:pl-8">
      <div className="font-display text-[clamp(2.4rem,4.6vw,3.8rem)] leading-none tabular-nums">{value}</div>
      <div className="mt-2 text-[14px] text-muted">{label}</div>
      {note && <div className="mt-1 text-[13px] text-[var(--dm-text-2)]">{note}</div>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-7">
      <h2 className="text-[1.8rem] leading-none md:text-[2.2rem]">{title}</h2>
      {subtitle && <p className="mt-1 mb-5 text-sm text-muted">{subtitle}</p>}
      {children}
    </section>
  );
}

function People({ title, people, role }: { title: string; people: Awaited<ReturnType<typeof topPeople>>; role: string }) {
  return (
    <Card title={title}>
      <ol className="space-y-2">
        {people.map((p, i) => (
          <li key={p.name}>
            <Link href={`/personne?nom=${encodeURIComponent(p.name)}&role=${role}`} className="group flex items-center gap-3 text-sm">
              <span className="font-display w-6 text-right text-muted">{i + 1}</span>
              <span className="flex-1 truncate group-hover:text-accent">{p.name}</span>
              <span className="text-xs text-muted tabular-nums">{p.seen} films{p.avgRating != null && ` · ${p.avgRating.toFixed(1).replace(".", ",")} ★`}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/personnes" className="mt-4 inline-block text-sm text-accent hover:underline">Voir le classement complet</Link>
    </Card>
  );
}

function Record({ label, title, value, href }: { label: string; title: string; value: string; href: string }) {
  return (
    <Link href={href} className="card card-hover p-5">
      <p className="text-xs tracking-wider text-muted uppercase">{label}</p>
      <p className="font-display mt-2 text-2xl leading-tight">{title}</p>
      <p className="mt-1 text-accent">{value}</p>
    </Link>
  );
}

// La frise : mes trois dernières années de cinéma, mois par mois.
async function Timeline() {
  const months = await timeline(36);
  let lastYear = "";
  return (
    <div className="relative">
      <div className="absolute top-0 bottom-0 left-[7px] w-px bg-border md:left-[11px]" />
      <div className="space-y-8">
        {months.map((m) => {
          const y = m.key.slice(0, 4);
          const showYear = y !== lastYear;
          lastYear = y;
          return (
            <section key={m.key} className="relative pl-8 md:pl-12">
              {showYear && <p className="font-display -ml-8 mb-4 text-5xl text-accent md:-ml-12 md:text-6xl">{y}</p>}
              <span className="absolute top-1.5 left-0 size-[15px] rounded-full border border-accent bg-background md:size-[23px]" />
              <h2 className="text-xl capitalize md:text-2xl">
                {m.label.replace(/ \d{4}$/, "")} <span className="text-sm text-muted">· {m.films.length} film{m.films.length > 1 ? "s" : ""}</span>
              </h2>
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
                {m.films.map((f, i) => (
                  <Link key={`${f.id}-${i}`} href={`/film/${f.id}`} className="group w-20 shrink-0 md:w-24" title={`${f.title} · vu le ${new Date(f.date).toLocaleDateString("fr-FR")}`}>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2">
                      {f.poster && <img src={poster(f.poster, "w185")!} alt={f.title} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />}
                      <span className="absolute top-1 left-1 rounded bg-black/70 px-1 text-[10px] text-white tabular-nums">{Number(f.date.slice(8, 10))}</span>
                      {f.rewatch && <span className="absolute top-1 right-1 rounded bg-accent px-1 text-[10px] text-on-accent">revu</span>}
                    </div>
                    {f.rating != null && <Stars rating={f.rating} className="mt-1 block text-[10px]" />}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
