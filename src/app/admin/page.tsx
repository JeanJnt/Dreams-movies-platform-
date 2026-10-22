import type { Metadata } from "next";
import Link from "next/link";
import { InviteForm, MemberActions, RevokeInvite } from "@/components/AdminTools";
import { RefListAdmin } from "@/components/RefListAdmin";
import { refLists } from "@/lib/ref-lists";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";
export const maxDuration = 60; // import de grandes listes

export default async function AdminPage() {
  const me = await requireAdmin();
  const [members, invites, lists] = await Promise.all([
    db().execute(`SELECT u.id, u.name, u.email, u.is_admin, u.created_at, (SELECT COUNT(*) FROM watched w WHERE w.user_id = u.id) AS films
                  FROM users u ORDER BY u.created_at`),
    db().execute(`SELECT i.code, i.note, i.expires_at, i.used_at, u.name AS used_by FROM invites i LEFT JOIN users u ON u.id = i.used_by
                  ORDER BY i.created_at DESC LIMIT 30`),
    refLists(),
  ]);
  const now = new Date().toISOString();

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-2 md:pt-8">
      <div>
        <Link href="/compte" className="text-sm text-muted hover:text-foreground">← Mon compte</Link>
        <h1 className="page-title mt-2 text-5xl leading-[0.95] md:text-7xl">Administration</h1>
        <p className="mt-3 text-muted">{members.rows.length} / 10 membres</p>
      </div>

      <section className="space-y-4 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-2xl">Inviter quelqu&apos;un</h2>
        <InviteForm />
        {invites.rows.length > 0 && (
          <ul className="divide-y divide-border text-sm">
            {invites.rows.map((i) => {
              const expired = !i.used_at && String(i.expires_at) < now;
              return (
                <li key={String(i.code)} className="flex items-center gap-3 py-2">
                  <span className="font-mono tracking-wider">{String(i.code)}</span>
                  <span className="flex-1 truncate text-muted">{i.note ? String(i.note) : ""}</span>
                  {i.used_by ? (
                    <span className="text-accent">✓ {String(i.used_by)}</span>
                  ) : expired ? (
                    <span className="text-muted">expirée</span>
                  ) : (
                    <>
                      <span className="text-xs text-muted">jusqu&apos;au {formatLongDate(String(i.expires_at).slice(0, 10))}</span>
                      <RevokeInvite code={String(i.code)} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-2xl">Listes de référence</h2>
        <p className="text-sm text-muted">Des listes communes à tous les membres (Sight and Sound, Top Letterboxd…). Chacun y voit sa progression.</p>
        <RefListAdmin lists={lists} />
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-2xl">Membres</h2>
        <ul className="divide-y divide-border">
          {members.rows.map((m) => (
            <li key={Number(m.id)} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-display flex size-9 items-center justify-center rounded-full bg-accent text-on-accent">{String(m.name).slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/membre/${m.id}`} className="hover:text-accent">{String(m.name)}</Link>
                {Boolean(m.is_admin) && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">admin</span>}
                <p className="truncate text-xs text-muted">{String(m.email)} · {Number(m.films)} films · depuis le {formatLongDate(String(m.created_at).slice(0, 10))}</p>
              </div>
              <MemberActions id={Number(m.id)} isAdmin={Boolean(m.is_admin)} isMe={Number(m.id) === me.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
