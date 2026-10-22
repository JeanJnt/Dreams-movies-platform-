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
    <div className="mx-auto max-w-2xl space-y-6 pt-2 md:pt-8">
      <h1 className="page-title text-4xl leading-[0.95] md:text-6xl">Modifier la liste</h1>
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
