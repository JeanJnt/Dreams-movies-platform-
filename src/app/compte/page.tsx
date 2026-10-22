import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { DeleteAccountForm, PasswordForm, ProfileForm, SessionButtons } from "@/components/AccountForms";
import { ImportPanel } from "@/components/ImportPanel";
import { LetterboxdConnect } from "@/components/LetterboxdConnect";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Mon compte" };
export const dynamic = "force-dynamic";
// L'import Letterboxd et le calcul des conseils peuvent prendre un moment : jusqu'à 60 s par étape.
export const maxDuration = 60;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const me = await requireUser();
  const { bienvenue } = await searchParams;
  const { rows } = await db().execute({
    sql: `SELECT u.calendar_token, u.created_at, u.letterboxd_username, u.letterboxd_synced_at,
            (SELECT COUNT(*) FROM watched WHERE user_id = u.id) AS watched,
            (SELECT COUNT(*) FROM sessions WHERE user_id = u.id AND expires_at > ?) AS sessions
          FROM users u WHERE u.id = ?`,
    args: [new Date().toISOString(), me.id],
  });
  const info = rows[0];
  const onboarding = Boolean(bienvenue) || Number(info.watched) === 0;
  const host = (await headers()).get("host") ?? "localhost:3000";
  const calendar = `webcal://${host}/agenda/ics?token=${info.calendar_token}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-2 md:pt-8">
      <div>
        <h1 className="page-title text-5xl leading-[0.95] md:text-7xl">Mon compte</h1>
        <p className="mt-3 text-muted">
          {me.username ? <b className="text-foreground">@{me.username}</b> : me.name} · {me.email}
          {me.isAdmin && <> · <Link href="/admin" className="text-accent hover:underline">Administration</Link></>}
        </p>
      </div>

      <ImportPanel welcome={onboarding} letterboxdConnected={Boolean(info.letterboxd_username)} />

      {/* Pendant l'accueil d'un nouveau membre, la connexion Letterboxd apparaît à la fin de l'import. */}
      {(!onboarding || info.letterboxd_username) && (
        <LetterboxdConnect connected={(info.letterboxd_username as string) ?? null} syncedAt={(info.letterboxd_synced_at as string) ?? null} />
      )}

      <section id="profil" className={`space-y-4 rounded-3xl border bg-surface p-5 md:p-6 ${me.username ? "border-border" : "border-accent"}`}>
        <h2 className="text-2xl">Profil et préférences</h2>
        {!me.username && <p className="text-sm text-accent">Choisis ton pseudo : c&apos;est lui que les autres membres verront.</p>}
        <ProfileForm user={me} />
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-2xl">Mon profil</h2>
        <p className="text-sm text-muted">Les autres membres voient ton profil : films vus, notes, coups de cœur, stats, collection, et tes critiques réglées sur « Membres ».</p>
        <Link href="/preferes" className="mr-2 inline-block rounded-full border border-border px-4 py-2 text-sm hover:border-accent">Mes 10 films préférés</Link>
        <Link href={`/membre/${me.id}`} className="inline-block rounded-full border border-border px-4 py-2 text-sm hover:border-accent">Voir mon profil comme les autres le voient</Link>
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-2xl">Agenda dans mon téléphone</h2>
        <p className="text-sm text-muted">Abonne ton calendrier (iPhone, Google Agenda, Outlook) à tes séances : elles s&apos;y ajoutent toutes seules. Ce lien est secret, ne le partage pas.</p>
        <a href={calendar} className="inline-block rounded-full bg-accent px-4 py-2 text-sm text-on-accent">S&apos;abonner à mon agenda</a>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-2xl">Sécurité</h2>
        <PasswordForm />
        <p className="text-sm text-muted">{Number(info.sessions)} appareil(s) connecté(s).</p>
        <SessionButtons />
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-2xl">Mes données</h2>
        <p className="text-sm text-muted">Tes données t&apos;appartiennent : tu peux les récupérer ou tout effacer à tout moment.</p>
        <a href="/compte/export" className="inline-block rounded-full border border-border px-4 py-2 text-sm hover:border-accent">⬇ Exporter toutes mes données (JSON)</a>
        <div>
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
