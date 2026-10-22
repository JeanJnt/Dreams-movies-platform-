"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type FormState } from "@/app/auth-actions";

const input = "field w-full py-3";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-xl bg-heart/15 px-4 py-3 text-sm text-heart" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{state.ok}</p>;
  return null;
}

export function LoginForm({ deleted }: { deleted?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {deleted && <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm">Ton compte et toutes tes données ont été supprimés.</p>}
      <Message state={state} />
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Email</span>
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Mot de passe</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      <button disabled={pending} className="w-full rounded-full bg-accent py-3 text-lg text-on-accent disabled:opacity-50">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ? <Link href="/inscription" className="text-accent hover:underline">Créer un compte avec une invitation</Link>
      </p>
      <p className="text-center text-xs text-muted">Mot de passe oublié ? Demande à l&apos;administrateur un mot de passe provisoire.</p>
    </form>
  );
}

export function SignupForm({ first }: { first: boolean }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      {first ? (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          Premier compte : tu deviens <b>administrateur</b>, et tu récupères les films déjà importés.
        </p>
      ) : (
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Code d&apos;invitation</span>
          <input name="invite" required autoComplete="off" placeholder="ABCD-EFGH2" className={`${input} font-mono tracking-widest uppercase`} />
        </label>
      )}
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Prénom</span>
        <input name="name" required maxLength={60} autoComplete="given-name" className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Pseudo (visible des autres membres)</span>
        <input name="username" required minLength={3} maxLength={21} pattern="@?[a-zA-Z0-9._]{3,20}" autoComplete="username" placeholder="ex. ogzy" className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Mot de passe (10 caractères minimum, avec un chiffre ou un symbole)</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Confirme le mot de passe</span>
        <input name="password2" type="password" required minLength={10} autoComplete="new-password" className={input} />
      </label>
      <button disabled={pending} className="w-full rounded-full bg-accent py-3 text-lg text-on-accent disabled:opacity-50">
        {pending ? "Création…" : "Créer mon compte"}
      </button>
      <p className="text-center text-sm text-muted">
        Déjà membre ? <Link href="/connexion" className="text-accent hover:underline">Se connecter</Link>
      </p>
    </form>
  );
}
