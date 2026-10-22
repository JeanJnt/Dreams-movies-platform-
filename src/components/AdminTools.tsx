"use client";

import { useActionState, useState, useTransition } from "react";
import { createInviteAction, resetPasswordAction, revokeInviteAction, setAdminAction } from "@/app/auth-actions";

export function InviteForm() {
  const [state, action, pending] = useActionState(createInviteAction, undefined);
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input name="note" placeholder="Pour qui ? (facultatif)" maxLength={80} className="field flex-1" />
        <button disabled={pending} className="rounded-full bg-accent px-5 py-2 text-on-accent">+ Créer une invitation</button>
      </div>
      {state?.error && <p className="text-sm text-heart">{state.error}</p>}
      {state?.ok && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent-soft p-4">
          <span className="font-mono text-2xl tracking-widest text-accent">{state.ok}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(state.ok!).then(() => setCopied(true))}
            className="rounded-full border border-border px-3 py-1 text-xs"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
          <span className="text-xs text-muted">Valable 2 semaines, une seule fois. Envoie-le avec l&apos;adresse de Dreams.</span>
        </div>
      )}
    </form>
  );
}

export function RevokeInvite({ code }: { code: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => revokeInviteAction(code))} className="text-xs text-muted hover:text-heart">
      Annuler
    </button>
  );
}

export function MemberActions({ id, isAdmin, isMe }: { id: number; isAdmin: boolean; isMe: boolean }) {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {!isMe && (
        <button disabled={pending} onClick={() => start(() => setAdminAction(id, !isAdmin))} className="rounded-full border border-border px-3 py-1 hover:border-accent">
          {isAdmin ? "Retirer admin" : "Nommer admin"}
        </button>
      )}
      {!isMe && (
        <button
          disabled={pending}
          onClick={() => confirm("Créer un mot de passe provisoire pour ce membre ? Il sera déconnecté partout.") && start(async () => setPassword((await resetPasswordAction(id)).password))}
          className="rounded-full border border-border px-3 py-1 hover:border-accent"
        >
          Mot de passe oublié
        </button>
      )}
      {password && (
        <span className="rounded-lg bg-accent-soft px-2 py-1 font-mono text-accent" title="À transmettre au membre, qui le changera dans Mon compte">
          {password}
        </span>
      )}
    </div>
  );
}
