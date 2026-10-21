"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const SORTS = [
  { value: "recent", label: "Ajoutés récemment" },
  { value: "rating", label: "Mieux notés" },
  { value: "year", label: "Année de sortie" },
  { value: "title", label: "Titre A→Z" },
];
const RATINGS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

const selectClass = "field";

export function FilterBar({ genres }: { genres: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };

  // La recherche se lance 300 ms après la dernière frappe.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => update("q", q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={`flex flex-wrap gap-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Titre, réalisateur…"
        className={`${selectClass} w-full md:w-64`}
      />
      <select value={params.get("sort") ?? "recent"} onChange={(e) => update("sort", e.target.value)} className={selectClass}>
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select value={params.get("genre") ?? ""} onChange={(e) => update("genre", e.target.value)} className={selectClass}>
        <option value="">Tous les genres</option>
        {genres.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <select value={params.get("rating") ?? ""} onChange={(e) => update("rating", e.target.value)} className={selectClass}>
        <option value="">Toutes les notes</option>
        {RATINGS.map((r) => (
          <option key={r} value={r}>{"★".repeat(Math.floor(r)) + (r % 1 ? "½" : "")}</option>
        ))}
      </select>
    </div>
  );
}
