import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilmGrid } from "@/components/FilmCard";
import { ShareListButton } from "@/components/ShareListButton";
import { userListDetail } from "@/lib/user-lists";

export const metadata: Metadata = { title: "Liste" };
export const dynamic = "force-dynamic";

export default async function UserListPage({ params }: { params: Promise<{ id: string }> }) {
  const list = await userListDetail({ id: Number((await params).id) || 0 });
  if (!list) notFound();
  return (
    <div className="space-y-6 pt-2 md:pt-8">
      <div>
        <p className="text-sm text-muted">
          {list.isMine ? "Ma liste" : <Link href={`/membre/${list.userId}`} className="hover:text-accent">Liste de @{list.author}</Link>} · {list.count} films
          {list.visibility === "prive" && " · privée"}
        </p>
        <h1 className="page-title mt-1 text-4xl leading-[0.95] md:text-6xl">{list.name}</h1>
        {list.description && <p className="mt-3 max-w-2xl text-muted">{list.description}</p>}
      </div>
      {list.isMine && (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/listes/perso/${list.id}/modifier`} className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">
            Modifier
          </Link>
          <ShareListButton id={list.id} name={list.name} token={list.shareToken} />
        </div>
      )}
      {list.films.length ? <FilmGrid films={list.films} /> : <p className="text-muted">Cette liste est vide.</p>}
    </div>
  );
}
