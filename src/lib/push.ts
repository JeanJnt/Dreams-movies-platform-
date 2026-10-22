import webpush from "web-push";
import { chosenFilter } from "./alert-sources";
import { db } from "./db";

// Notifications sur le téléphone ou l'ordinateur (Web Push). Sur iPhone, il faut que Dreams soit installé sur l'écran d'accueil.
// Clés VAPID : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (variables d'environnement).

export const pushEnabled = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://dreams.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

export async function saveSubscription(u: number, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) throw new Error("Abonnement invalide");
  await db().execute({
    sql: `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [u, sub.endpoint, sub.keys.p256dh.slice(0, 200), sub.keys.auth.slice(0, 100)],
  });
}

export async function removeSubscription(u: number, endpoint: string) {
  await db().execute({ sql: "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?", args: [u, endpoint] });
}

// Envoie une notification à tous les appareils d'un membre ; oublie les abonnements expirés.
// persistent : la notification reste affichée tant qu'on ne l'a pas fermée (rappel de séance)
export async function sendPush(u: number, payload: { title: string; body: string; url: string; tag?: string; persistent?: boolean }) {
  if (!pushEnabled()) return 0;
  configure();
  const { rows } = await db().execute({ sql: "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?", args: [u] });
  let sent = 0;
  for (const r of rows) {
    try {
      await webpush.sendNotification({ endpoint: String(r.endpoint), keys: { p256dh: String(r.p256dh), auth: String(r.auth) } }, JSON.stringify(payload), { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db().execute({ sql: "DELETE FROM push_subscriptions WHERE endpoint = ?", args: [r.endpoint] });
    }
  }
  return sent;
}

// Après la mise à jour des alertes : prévient le membre des films nouvellement à l'affiche (une seule notification groupée).
// Seules les alertes apparues après l'activation des notifications sont envoyées, une seule fois chacune.
export async function notifyNewAlerts(u: number) {
  if (!pushEnabled()) return 0;
  const subs = await db().execute({ sql: "SELECT MIN(created_at) AS since FROM push_subscriptions WHERE user_id = ?", args: [u] });
  const since = subs.rows[0]?.since as string | null;
  if (!since) return 0;
  const { rows } = await db().execute({
    sql: `SELECT a.tmdb_id, a.film_id, a.kind, COALESCE(f.title_fr, f.name) AS title FROM alerts a JOIN films f ON f.id = a.film_id
          WHERE a.user_id = ? AND a.notified = 0 AND a.created_at >= ? AND ${await chosenFilter(u)} ORDER BY a.created_at`,
    args: [u, since],
  });
  if (!rows.length) return 0;
  const titles = rows.map((r) => String(r.title));
  const where = (k: unknown) => (k === "paris" ? "passe à Paris" : k === "bientot" ? "sort bientôt au cinéma" : "est en salle");
  const payload =
    rows.length === 1
      ? { title: titles[0], body: `${titles[0]} ${where(rows[0].kind)}.`, url: `/film/${rows[0].film_id}`, tag: "alertes" }
      : { title: `${rows.length} de tes films au cinéma`, body: `${titles.slice(0, 3).join(", ")}${rows.length > 3 ? "…" : ""}`, url: "/alertes", tag: "alertes" };
  await sendPush(u, payload);
  await db().execute({ sql: "UPDATE alerts SET notified = 1 WHERE user_id = ? AND notified = 0", args: [u] });
  return rows.length;
}

// Le jour d'une séance : une notification qui reste affichée (écran de verrouillage) jusqu'à ce qu'on la ferme.
// Une seule par séance et par membre (organisateur comme invités) ; les séances ajoutées dans la journée sont prises au passage suivant.
export async function remindTodayEvents(u: number) {
  if (!pushEnabled()) return 0;
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 10);
  const now = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 16).replace(" ", "T");
  const { rows } = await db().execute({
    sql: `SELECT e.id, e.title, e.starts_at, e.place, e.link FROM events e
          WHERE (e.user_id = ? OR e.id IN (SELECT event_id FROM event_guests WHERE user_id = ?))
            AND substr(e.starts_at, 1, 10) = ? AND e.starts_at >= ?
            AND e.id NOT IN (SELECT event_id FROM event_reminders WHERE user_id = ?)
          ORDER BY e.starts_at`,
    args: [u, u, today, now, u],
  });
  for (const e of rows) {
    const hour = String(e.starts_at).slice(11).replace(":", " h ");
    await sendPush(u, {
      title: `Séance aujourd'hui · ${hour}`,
      body: [String(e.title), e.place as string | null].filter(Boolean).join(" · "),
      url: (e.link as string) || "/agenda",
      tag: `seance-${e.id}`,
      persistent: true,
    });
    await db().execute({ sql: "INSERT OR IGNORE INTO event_reminders (user_id, event_id) VALUES (?, ?)", args: [u, Number(e.id)] });
  }
  return rows.length;
}
