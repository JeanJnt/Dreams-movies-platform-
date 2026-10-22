"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, deleteAccountAction, logoutAction, logoutEverywhereAction, updateProfileAction, type FormState } from "@/app/auth-actions";
import { TITLE_LANGS } from "@/lib/titles";

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

const COUNTRIES = [
  ["FR", "France"], ["BE", "Belgique"], ["CH", "Suisse"], ["LU", "Luxembourg"], ["CA", "Canada"], ["GB", "Royaume-Uni"],
  ["US", "États-Unis"], ["DE", "Allemagne"], ["ES", "Espagne"], ["IT", "Italie"], ["JP", "Japon"],
] as const;
const CITIES = ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nantes", "Strasbourg", "Montpellier", "Rennes", "Nice", "Grenoble", "Bruxelles", "Genève", "Lausanne", "Montréal"];

export function ProfileForm({ user }: { user: { name: string; username: string | null; titleLang: string; city: string; country: string } }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const label = "block space-y-1.5 text-sm";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className={label}>
        <span className="text-muted">Pseudo (visible des autres membres)</span>
        <div className="flex items-center rounded-xl border border-border bg-background px-3 focus-within:border-accent">
          <span className="text-muted">@</span>
          <input name="username" defaultValue={user.username ?? ""} required minLength={3} maxLength={21} pattern="@?[a-zA-Z0-9._]{3,20}" placeholder="ton pseudo" className="w-full bg-transparent py-2 pl-1 outline-none" />
        </div>
      </label>
      <label className={label}>
        <span className="text-muted">Prénom</span>
        <input name="name" defaultValue={user.name} required maxLength={60} className="field w-full" />
      </label>
      <label className={label}>
        <span className="text-muted">Titres traduits, affichés en petit sous le titre original</span>
        <select name="title_lang" defaultValue={user.titleLang} className="field w-full">
          {TITLE_LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          <option value="none">Aucun : titre original seulement</option>
        </select>
      </label>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className={label}>
          <span className="text-muted">Ma ville (séances de cinéma)</span>
          <input name="city" defaultValue={user.city} list="dreams-cities" maxLength={60} className="field w-full" />
          <datalist id="dreams-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className={label}>
          <span className="text-muted">Pays</span>
          <select name="country" defaultValue={user.country} className="field">
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="rounded-full bg-accent px-4 py-2 text-sm text-on-accent">Enregistrer</button>
        <Message state={state} />
      </div>
    </form>
  );
}
