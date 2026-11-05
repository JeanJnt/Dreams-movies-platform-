import type { Metadata } from "next";
import { ListEditor } from "@/components/ListEditor";

export const metadata: Metadata = { title: "Nouvelle liste" };
export const maxDuration = 60;

export default function NewListPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-4 md:pt-14">
      <h1 className="page-title font-display text-[clamp(2.4rem,6.5vw,4.75rem)] leading-[0.92] text-balance">Nouvelle liste</h1>
      <ListEditor initial={{ name: "", description: "", visibility: "membres", films: [] }} />
    </div>
  );
}
