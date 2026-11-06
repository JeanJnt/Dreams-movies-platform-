import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListEditor } from "@/components/ListEditor";
import { userListDetail } from "@/lib/user-lists";

export const metadata: Metadata = { title: "Modifier la liste" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function EditListPage({ params }: { params: Promise<{ id: string }> }) {
  const list = await userListDetail({ id: Number((await params).id) || 0 });
  if (!list || !list.isMine) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-4 md:pt-14">
      <h1 className="page-title font-display text-[clamp(2.4rem,6.5vw,4.75rem)] leading-[0.92] text-balance">Modifier la liste</h1>
      <ListEditor
        initial={{
          id: list.id,
          name: list.name,
          description: list.description ?? "",
          visibility: list.visibility,
          films: list.films.map((f) => ({ key: `f${f.id}`, title: f.title_fr ?? f.name, year: f.year, poster: f.poster_path })),
        }}
      />
    </div>
  );
}
