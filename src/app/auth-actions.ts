"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { quickCheck } from "@/lib/alerts";
import {
  checkPasswordStrength, clientIp, createSession, createUser, currentUser, destroySession, hashPassword,
  newInviteCode, recordFailedAttempt, requireAdmin, requireUser, tooManyAttempts, verifyPassword,
} from "@/lib/auth";
import { db, ensureSchema, USER_TABLES } from "@/lib/db";
import { enrichBatch } from "@/lib/enrich";
import { importLetterboxd, type ImportSummary } from "@/lib/importer";
import { deleteUserFiles } from "@/lib/storage";
import { connectLetterboxd, disconnectLetterboxd, syncLetterboxd } from "@/lib/letterboxd-sync";
import { recoDetails, recoSeeds, recoWatchlistProviders } from "@/lib/reco-compute";

export type FormState = { error?: string; ok?: string } | undefined;

const field = (form: FormData, name: string, max = 200) => String(form.get(name) ?? "").trim().slice(0, max);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// --- Connexion / inscription / déconnexion ---

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  await ensureSchema();
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const key = `${email}|${await clientIp()}`;
  if (await tooManyAttempts(key)) return { error: "Trop d'essais. Réessaie dans 15 minutes." };

  const { rows } = await db().execute({ sql: "SELECT id, password_hash FROM users WHERE email = ?", args: [email] });
  // Même réponse que l'email existe ou non : on ne révèle pas qui a un compte.
  const ok = rows[0] ? await verifyPassword(password, String(rows[0].password_hash)) : await verifyPassword(password, "scrypt$AAAA$AAAA");
  if (!rows[0] || !ok) {
    await recordFailedAttempt(key);
    return { error: "Email ou mot de passe incorrect." };
  }
  await createSession(Number(rows[0].id));
  redirect("/");
}

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  await ensureSchema();
  const name = field(form, "name", 60);
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const inviteCode = field(form, "invite", 20);
  if (!name) return { error: "Indique ton prénom ou ton pseudo." };
  if (!isEmail(email)) return { error: "Adresse email invalide." };
  const weak = checkPasswordStrength(password);
  if (weak) return { error: weak };
  if (password !== String(form.get("password2") ?? "")) return { error: "Les deux mots de passe ne sont pas identiques." };

  const key = `signup|${await clientIp()}`;
  if (await tooManyAttempts(key)) return { error: "Trop d'essais. Réessaie dans 15 minutes." };
  const exists = await db().execute({ sql: "SELECT 1 FROM users WHERE email = ?", args: [email] });
  if (exists.rows[0]) return { error: "Un compte existe déjà avec cet email." };

  let user;
  try {
    user = await createUser({ email, name, password, inviteCode });
  } catch (e) {
    await recordFailedAttempt(key);
    return { error: (e as Error).message };
  }
  await createSession(user.id);
  redirect("/compte?bienvenue=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/connexion");
}

// --- Mon compte ---

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const { rows } = await db().execute({ sql: "SELECT password_hash FROM users WHERE id = ?", args: [me.id] });
  if (!(await verifyPassword(current, String(rows[0].password_hash)))) return { error: "Mot de passe actuel incorrect." };
  const weak = checkPasswordStrength(next);
  if (weak) return { error: weak };
  await db().execute({ sql: "UPDATE users SET password_hash = ? WHERE id = ?", args: [await hashPassword(next), me.id] });
  // Par sécurité, on déconnecte les autres appareils, puis on recrée une session pour celui-ci.
  await db().execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [me.id] });
  await createSession(me.id);
  return { ok: "Mot de passe changé. Tes autres appareils ont été déconnectés." };
}

export async function logoutEverywhereAction() {
  const me = await requireUser();
  await db().execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [me.id] });
  await destroySession();
  redirect("/connexion");
}

export async function deleteAccountAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  const { rows } = await db().execute({ sql: "SELECT password_hash FROM users WHERE id = ?", args: [me.id] });
  if (!(await verifyPassword(String(form.get("password") ?? ""), String(rows[0].password_hash)))) return { error: "Mot de passe incorrect." };
  if (me.isAdmin) {
    const admins = await db().execute("SELECT COUNT(*) AS n FROM users WHERE is_admin = 1");
    const members = await db().execute("SELECT COUNT(*) AS n FROM users");
    if (Number(admins.rows[0].n) === 1 && Number(members.rows[0].n) > 1) return { error: "Tu es le seul administrateur : nomme d'abord un autre administrateur." };
  }
  // Tout ce qui appartient au membre disparaît : données, fichiers, sessions, puis le compte lui-même.
  await db().batch(
    [
      ...USER_TABLES.map((t) => ({ sql: `DELETE FROM ${t} WHERE user_id = ?`, args: [me.id] })),
      { sql: "DELETE FROM sessions WHERE user_id = ?", args: [me.id] },
      { sql: "DELETE FROM invites WHERE created_by = ? AND used_by IS NULL", args: [me.id] },
      { sql: "DELETE FROM users WHERE id = ?", args: [me.id] },
    ],
    "write",
  );
  await deleteUserFiles(me.id);
  await destroySession();
  redirect("/connexion?supprime=1");
}

// --- Import Letterboxd (en plusieurs étapes, pour la barre de progression) ---

export async function importLetterboxdAction(form: FormData): Promise<{ summary?: ImportSummary; error?: string }> {
  const me = await requireUser();
  const file = form.get("zip");
  if (!(file instanceof File) || !file.size) return { error: "Choisis le fichier .zip exporté depuis Letterboxd." };
  if (!file.name.toLowerCase().endsWith(".zip")) return { error: "Il faut le fichier .zip (Letterboxd → Settings → Import & Export → Export your data)." };
  try {
    const summary = await importLetterboxd(me.id, Buffer.from(await file.arrayBuffer()));
    revalidatePath("/", "layout");
    return { summary };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function enrichStepAction() {
  await requireUser();
  return enrichBatch(40);
}

export async function recoStepAction(step: "seeds" | "details" | "providers" | "alerts") {
  const me = await requireUser();
  if (step === "seeds") return { remaining: (await recoSeeds(me.id)).candidates };
  if (step === "details") return recoDetails(me.id);
  if (step === "providers") return recoWatchlistProviders(me.id);
  await quickCheck(me.id);
  revalidatePath("/", "layout");
  return { remaining: 0 };
}

// --- Synchronisation Letterboxd (flux RSS public) ---

export async function connectLetterboxdAction(username: string) {
  const me = await requireUser();
  const res = await connectLetterboxd(me.id, String(username).slice(0, 60));
  revalidatePath("/", "layout");
  return res;
}

export async function syncLetterboxdAction() {
  const me = await requireUser();
  const res = await syncLetterboxd(me.id);
  revalidatePath("/", "layout");
  return res;
}

export async function disconnectLetterboxdAction() {
  const me = await requireUser();
  await disconnectLetterboxd(me.id);
  revalidatePath("/compte");
}

// --- Administration (invitations et membres) ---

const MAX_MEMBERS = 10;

export async function createInviteAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { rows } = await db().execute("SELECT COUNT(*) AS n FROM users");
  if (Number(rows[0].n) >= MAX_MEMBERS) return { error: `Dreams est limité à ${MAX_MEMBERS} membres.` };
  const code = newInviteCode();
  const expires = new Date(Date.now() + 14 * 86_400_000).toISOString(); // valable 2 semaines
  await db().execute({
    sql: "INSERT INTO invites (code, created_by, note, expires_at) VALUES (?, ?, ?, ?)",
    args: [code, admin.id, field(form, "note", 80) || null, expires],
  });
  revalidatePath("/admin");
  return { ok: code };
}

export async function revokeInviteAction(code: string) {
  await requireAdmin();
  await db().execute({ sql: "DELETE FROM invites WHERE code = ? AND used_by IS NULL", args: [code] });
  revalidatePath("/admin");
}

export async function setAdminAction(userId: number, isAdmin: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id && !isAdmin) return; // on ne se retire pas soi-même ses droits
  await db().execute({ sql: "UPDATE users SET is_admin = ? WHERE id = ?", args: [isAdmin ? 1 : 0, userId] });
  revalidatePath("/admin");
}

// Mot de passe oublié : l'administrateur génère un mot de passe provisoire à transmettre au membre.
export async function resetPasswordAction(userId: number): Promise<{ password: string }> {
  await requireAdmin();
  const password = `${newInviteCode()}-${newInviteCode()}`.toLowerCase();
  await db().execute({ sql: "UPDATE users SET password_hash = ? WHERE id = ?", args: [await hashPassword(password), userId] });
  await db().execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [userId] });
  return { password };
}

export async function whoAmI() {
  return currentUser();
}
