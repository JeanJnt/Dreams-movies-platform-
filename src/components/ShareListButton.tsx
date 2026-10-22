"use client";

import { useState, useTransition } from "react";
import { shareUserListAction } from "@/app/actions";

// Partager une liste : crée un lien secret (lisible sans compte), puis ouvre le menu de partage du téléphone ou copie le lien.
export function ShareListButton({ id, name, token: initial }: { id: number; name: string; token: string | null }) {
  const [token, setToken] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const share = () =>
    start(async () => {
      const t = token ?? (await shareUserListAction(id, true)).token!;
      setToken(t);
      const url = `${location.origin}/partage/${t}`;
      if (navigator.share) {
        await navigator.share({ title: name, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        setMsg("Lien copié");
      }
    });

  const unshare = () =>
    start(async () => {
      await shareUserListAction(id, false);
      setToken(null);
      setMsg("Lien désactivé");
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={share} disabled={pending} className="rounded-full bg-accent px-4 py-2 text-sm text-on-accent">
        Partager
      </button>
      {token && (
        <button onClick={unshare} disabled={pending} className="rounded-full border border-border px-4 py-2 text-sm text-muted">
          Désactiver le lien
        </button>
      )}
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
