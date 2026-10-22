"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, deleteAccountAction, logoutAction, logoutEverywhereAction, type FormState } from "@/app/auth-actions";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-heart" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-accent">{state.ok}</p>;
  return null;
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input name="current" type="password" required autoComplete="current-password" placeholder="Mot de passe actuel" className="field w-full" />
      <input name="next" type="password" required minLength={10} autoComplete="new-password" placeholder="Nouveau mot de passe (10 caractères min.)" className="field w-full" />
      <Message state={state} />
      <button disabled={pending} className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">Changer le mot de passe</button>
    </form>
  );
}

export function SessionButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={logoutAction}>
        <button className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">Se déconnecter</button>
      </form>
      <form action={logoutEverywhereAction}>
        <button className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">Déconnecter tous mes appareils</button>
      </form>
    </div>
  );
}

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccountAction, undefined);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-heart hover:underline">
        Supprimer mon compte…
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-heart/50 p-4">
      <p className="text-sm">
        Tout sera effacé <b>définitivement</b> : films, notes, critiques, collection, photos, agenda. Pense à exporter tes données avant.
      </p>
      <input name="password" type="password" required autoComplete="current-password" placeholder="Ton mot de passe pour confirmer" className="field w-full" />
      <Message state={state} />
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-full bg-heart px-4 py-2 text-sm text-black">Supprimer définitivement</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm">Annuler</button>
      </div>
    </form>
  );
}
