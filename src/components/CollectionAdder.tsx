"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addManyOwnedAction } from "@/app/actions";
import { FilmPicker, type Picked } from "./FilmPicker";

const FORMATS = ["DVD", "Blu-ray", "Blu-ray 4K", "Numérique", "VHS"];
const CASES = [
  { key: "amaray", label: "Boîtier classique" },
  { key: "steelbook", label: "Steelbook" },
  { key: "digipack", label: "Digipack" },
  { key: "coffret", label: "Coffret" },
];

export function CollectionAdder() {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked[]>([]);
  const [format, setFormat] = useState("DVD");
  const [caseType, setCaseType] = useState("amaray");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await addManyOwnedAction(picked.map((p) => p.key), format, caseType);
      if ("error" in res && res.error) return setError(res.error);
      router.push("/collection");
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <FilmPicker picked={picked} onChange={setPicked} />

      <div className="space-y-3">
        <p className="text-sm text-muted">Format</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {FORMATS.map((f) => (
            <button key={f} type="button" onClick={() => setFormat(f)} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${format === f ? "border-accent bg-accent text-on-accent" : "border-border"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {CASES.map((c) => (
            <button key={c.key} type="button" onClick={() => setCaseType(c.key)} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${caseType === c.key ? "border-foreground bg-foreground text-background" : "border-border"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-heart">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={!picked.length || pending}
        className="w-full rounded-full bg-accent py-3 font-medium text-on-accent disabled:opacity-40"
      >
        {pending ? "Ajout…" : picked.length ? `Ajouter ${picked.length} film${picked.length > 1 ? "s" : ""} à ma collection` : "Choisis des films"}
      </button>
    </div>
  );
}
