import type { Metadata } from "next";
import { ListEditor } from "@/components/ListEditor";

export const metadata: Metadata = { title: "Nouvelle liste" };
export const maxDuration = 60;

export default function NewListPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-2 md:pt-8">
      <h1 className="page-title text-4xl leading-[0.95] md:text-6xl">Nouvelle liste</h1>
      <ListEditor initial={{ name: "", description: "", visibility: "membres", films: [] }} />
    </div>
  );
}
