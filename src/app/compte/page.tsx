import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { DeleteAccountForm, PasswordForm, ProfileForm, SessionButtons } from "@/components/AccountForms";
import { ImportPanel } from "@/components/ImportPanel";
import { LetterboxdConnect } from "@/components/LetterboxdConnect";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeChoice } from "@/components/ThemeChoice";

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

  const sections = [
    { id: "import", label: "Letterboxd" },
    { id: "profil", label: "Profil" },
    { id: "theme", label: "Thème" },
    { id: "agenda", label: "Agenda" },
    { id: "securite", label: "Sécurité" },
    { id: "donnees", label: "Mes données" },
  ];
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Réglages"
        number={me.email}
        title="Mon compte"
        actions={
          <>
            <Link href={`/membre/${me.id}`} className="btn">
              Voir mon profil
            </Link>
            {me.isAdmin && (
              <Link href="/admin" className="btn">
                Administration
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        {/* sommaire des réglages */}
        <nav aria-label="Réglages" className="no-scrollbar bleed flex gap-1 overflow-x-auto lg:sticky lg:top-[calc(var(--nav-offset,4.5rem)+1.5rem)] lg:mx-0 lg:flex-col lg:self-start lg:px-0">
          {sections.map((x) => (
            <a key={x.id} href={`#${x.id}`} className="chip !shadow-none hover:!bg-white/[0.05] lg:!justify-start">
              {x.label}
            </a>
          ))}
        </nav>

        <div className="min-w-0 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          <Setting id="import" title="Letterboxd" text="Une fois votre profil connecté, la synchronisation récupère chaque jour vos nouveaux films ; l'import d'un export Letterboxd complète le reste (critiques, listes).">
            {/* Une fois connecté, la synchronisation passe en premier : c'est elle qu'on vient chercher ici. */}
            {info.letterboxd_username ? <LetterboxdConnect connected={info.letterboxd_username as string} syncedAt={(info.letterboxd_synced_at as string) ?? null} /> : null}
            <ImportPanel welcome={onboarding} letterboxdConnected={Boolean(info.letterboxd_username)} />
            {/* Pendant l'accueil d'un nouveau membre, la connexion Letterboxd apparaît à la fin de l'import. */}
            {!onboarding && !info.letterboxd_username && <LetterboxdConnect connected={null} />}
          </Setting>

          <Setting id="profil" title="Profil et préférences" text={me.username ? "Ce que les autres membres voient de vous, et vos préférences d'affichage." : "Choisissez votre pseudo : c'est lui que les autres membres verront."}>
            <ProfileForm user={me} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/preferes" className="btn btn-sm">
                Mes 10 films préférés
              </Link>
              <Link href={`/membre/${me.id}`} className="btn btn-sm">
                Voir mon profil comme les autres
              </Link>
            </div>
          </Setting>

          <Setting id="theme" title="Thème" text="Noir et blanc, avec l'argent du logo ; ou noir et rouge vif. Seule la couleur des actions et des repères change.">
            <ThemeChoice />
          </Setting>

          <Setting id="agenda" title="Agenda dans mon téléphone" text="Vos séances dans le calendrier de votre téléphone. Ce lien est personnel : ne le partagez pas.">
            <a href={calendar} className="btn btn-primary">
              S&apos;abonner à mon agenda
            </a>
          </Setting>

          <Setting id="securite" title="Sécurité" text={`${Number(info.sessions)} appareil${Number(info.sessions) > 1 ? "s" : ""} connecté${Number(info.sessions) > 1 ? "s" : ""} en ce moment.`}>
            <PasswordForm />
            <SessionButtons />
          </Setting>

          <Setting id="donnees" title="Mes données" text="Vos données vous appartiennent : récupérez-les ou effacez tout, à tout moment.">
            <a href="/compte/export" className="btn">
              Exporter toutes mes données (JSON)
            </a>
            <DeleteAccountForm />
          </Setting>
        </div>
      </div>
    </div>
  );
}

// Une rubrique de réglages : le titre et l'explication à gauche, les contrôles à droite
function Setting({ id, title, text, children }: { id: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="grid scroll-mt-28 gap-6 py-10 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-12">
      <div>
        <h2 id={`${id}-t`} className="text-[1.9rem] leading-none">
          {title}
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{text}</p>
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  );
}
