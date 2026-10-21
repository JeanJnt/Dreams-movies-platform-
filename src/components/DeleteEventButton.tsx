"use client";

import { useTransition } from "react";
import { deleteEventAction } from "@/app/actions";

export function DeleteEventButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => confirm("Supprimer cette séance ?") && startTransition(() => deleteEventAction(id))}
      disabled={pending}
      className="self-start px-1 text-muted hover:text-heart"
      aria-label="Supprimer la séance"
    >
      ✕
    </button>
  );
}
