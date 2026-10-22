import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, ensureSchema, USER_TABLES } from "./db";
import { isTitleLang, type TitleLang } from "./titles";

/*
 * Sécurité des comptes
 * - Mots de passe : scrypt (lent exprès) avec un sel aléatoire par compte. On ne stocke jamais le mot de passe.
 * - Sessions : jeton aléatoire de 256 bits dans un cookie HttpOnly (inaccessible au JavaScript), Secure en ligne,
 *   SameSite=Lax. En base, on ne garde que son empreinte SHA-256 : une fuite de la base ne permet pas de se connecter.
 * - Inscription : seulement avec un code d'invitation (sauf le tout premier compte, qui devient administrateur).
 * - Connexion : au-delà de 8 essais ratés en 15 minutes, on bloque temporairement.
 */

const COOKIE = "dreams_session";
const SESSION_DAYS = 30;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type User = {
  id: number;
  email: string;
  name: string;
  username: string | null; // pseudo public (@pseudo)
  isAdmin: boolean;
  titleLang: TitleLang; // langue des titres traduits affichés sous le titre original
  city: string; // ville pour les séances de cinéma
  country: string; // pays (code ISO) pour les sorties en salle
};

const USER_COLUMNS = "u.id, u.email, u.name, u.username, u.is_admin, u.title_lang, u.city, u.country";
const toUser = (r: Record<string, unknown>): User => ({
  id: Number(r.id),
  email: String(r.email),
  name: String(r.name),
  username: (r.username as string) ?? null,
  isAdmin: Boolean(r.is_admin),
  titleLang: isTitleLang(String(r.title_lang ?? "fr")) ? (String(r.title_lang ?? "fr") as TitleLang) : "fr",
  city: String(r.city ?? "Paris"),
  country: String(r.country ?? "FR"),
});

// Nom affiché aux autres membres : le pseudo s'il existe, sinon le prénom.
export const displayName = (u: Pick<User, "name" | "username">) => u.username ?? u.name;

// --- Mots de passe ---

function scryptAsync(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, 64, SCRYPT, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function checkPasswordStrength(password: string): string | null {
  if (password.length < 10) return "Le mot de passe doit faire au moins 10 caractères.";
  if (password.length > 200) return "Mot de passe trop long.";
  if (!/[a-zA-Z]/.test(password) || !/[^a-zA-Z]/.test(password)) return "Mélange des lettres et au moins un chiffre ou un symbole.";
  return null;
}

// --- Sessions ---

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: number) {
  await ensureSchema();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db().execute({
    sql: "INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES (?, ?, ?, ?)",
    args: [sha256(token), userId, expires.toISOString(), ua],
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sha256(token)] });
  jar.delete(COOKIE);
}

// L'utilisateur connecté (vérifié en base), mémorisé pour la durée d'une requête.
export const currentUser = cache(async (): Promise<User | null> => {
  if (cliUser) return cliUser;
  let token: string | undefined;
  try {
    token = (await cookies()).get(COOKIE)?.value;
  } catch {
    return null; // hors requête (script)
  }
  if (!token) return null;
  await ensureSchema();
  const { rows } = await db().execute({
    sql: `SELECT ${USER_COLUMNS} FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ? AND s.expires_at > ?`,
    args: [sha256(token), new Date().toISOString()],
  });
  const r = rows[0];
  return r ? toUser(r) : null;
});

// À appeler au début de chaque page, action ou requête qui touche aux données d'un utilisateur.
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function uid(): Promise<number> {
  return (await requireUser()).id;
}

// Le membre dont on lit les données : soi-même par défaut, ou un autre membre (pages de profil).
// Il faut toujours être connecté. Ce n'est utilisé que pour LIRE : on n'écrit jamais chez un autre.
export async function viewedUser(userId?: number): Promise<number> {
  const me = await requireUser();
  if (userId == null || userId === me.id) return me.id;
  if (!Number.isInteger(userId) || userId <= 0) redirect("/membres");
  const { rows } = await db().execute({ sql: "SELECT id FROM users WHERE id = ?", args: [userId] });
  if (!rows[0]) redirect("/membres");
  return userId;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

// Pour les scripts en ligne de commande (npm run alertes -- --email moi@exemple.fr).
let cliUser: User | null = null;
export async function setCliUser(email: string) {
  await ensureSchema();
  const { rows } = await db().execute({ sql: `SELECT ${USER_COLUMNS} FROM users u WHERE u.email = ?`, args: [email] });
  if (!rows[0]) throw new Error(`Aucun compte pour ${email}`);
  cliUser = toUser(rows[0]);
  return cliUser;
}

// --- Limitation des essais ---

const MAX_ATTEMPTS = 8;
const WINDOW = "-15 minutes";

export async function tooManyAttempts(key: string) {
  await db().execute({ sql: "DELETE FROM login_attempts WHERE at < datetime('now', '-1 day')", args: [] });
  const { rows } = await db().execute({ sql: "SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > datetime('now', ?)", args: [key, WINDOW] });
  return Number(rows[0].n) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(key: string) {
  await db().execute({ sql: "INSERT INTO login_attempts (key) VALUES (?)", args: [key] });
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

// --- Comptes ---

export async function userCount() {
  await ensureSchema();
  const { rows } = await db().execute("SELECT COUNT(*) AS n FROM users");
  return Number(rows[0].n);
}

export async function createUser(input: { email: string; name: string; username?: string; password: string; inviteCode?: string }) {
  await ensureSchema();
  const first = (await userCount()) === 0;
  let invite: string | null = null;
  if (!first) {
    const code = (input.inviteCode ?? "").trim().toUpperCase();
    const { rows } = await db().execute({ sql: "SELECT code FROM invites WHERE code = ? AND used_by IS NULL AND expires_at > ?", args: [code, new Date().toISOString()] });
    if (!rows[0]) throw new Error("Code d'invitation invalide ou expiré.");
    invite = code;
  }
  const hash = await hashPassword(input.password);
  const res = await db().execute({
    sql: "INSERT INTO users (email, name, username, password_hash, is_admin, calendar_token) VALUES (?, ?, ?, ?, ?, ?)",
    args: [input.email.trim().toLowerCase(), input.name.trim(), input.username ?? null, hash, first ? 1 : 0, randomBytes(24).toString("base64url")],
  });
  const id = Number(res.lastInsertRowid);
  if (invite) await db().execute({ sql: "UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE code = ?", args: [id, invite] });
  // Le tout premier compte récupère les données importées avant la création des comptes.
  if (first) await db().batch(USER_TABLES.map((t) => ({ sql: `UPDATE ${t} SET user_id = ? WHERE user_id = 0`, args: [id] })), "write");
  return { id, isAdmin: first };
}

export function newInviteCode() {
  // 10 caractères faciles à recopier (sans 0/O ni 1/I), ex. « K7MQ-X4P9R »
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(9);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 9)}`;
}

// Pseudo : 3 à 20 caractères, lettres sans accents, chiffres, « . » et « _ ».
export function checkUsername(raw: string): { username?: string; error?: string } {
  const username = raw.trim().replace(/^@/, "");
  if (!/^[a-zA-Z0-9._]{3,20}$/.test(username)) return { error: "Pseudo : 3 à 20 caractères (lettres, chiffres, « . » ou « _ »)." };
  return { username };
}

export async function usernameTaken(username: string, exceptId?: number) {
  const { rows } = await db().execute({ sql: "SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?", args: [username, exceptId ?? 0] });
  return Boolean(rows[0]);
}
