"use client";

import { useState, useTransition } from "react";
import { refreshAlertsAction } from "@/app/actions";

export function RefreshAlerts() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-muted">{msg}</span>}
      <button
        onClick={() => startTransition(async () => setMsg(`${await refreshAlertsAction()} film(s) trouvés`))}
        disabled={pending}
        className="rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
      >
        {pending ? "Vérification…" : "↻ Vérifier maintenant"}
      </button>
    </div>
  );
}
