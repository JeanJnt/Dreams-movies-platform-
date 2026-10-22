import { quickCheck } from "@/lib/alerts";
import { db, ensureSchema } from "@/lib/db";
import { titlesBatch } from "@/lib/enrich";
import { syncLetterboxd } from "@/lib/letterboxd-sync";
import { notifyNewAlerts, remindTodayEvents } from "@/lib/push";

// Tâche planifiée (voir vercel.json), 4 fois par jour : pour chaque membre,
// récupère ses nouveaux films Letterboxd, met à jour ses alertes « au cinéma » et le prévient des nouvelles.
// Vercel l'appelle avec le secret CRON_SECRET ; sans lui, la route refuse.
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Non autorisé", { status: 401 });
  await ensureSchema();
  const { rows } = await db().execute("SELECT id, letterboxd_username FROM users");
  const results: Record<string, { films: number; alertes: number; notifiees: number }> = {};
  for (const r of rows) {
    const sync = r.letterboxd_username ? await syncLetterboxd(Number(r.id)).catch(() => null) : null;
    const alertes = await quickCheck(Number(r.id)).catch(() => -1);
    // Notification sur le téléphone pour les films nouvellement à l'affiche
    const notifiees = await notifyNewAlerts(Number(r.id)).catch(() => 0);
    // Rappel des séances du jour (notification qui reste sur l'écran de verrouillage)
    await remindTodayEvents(Number(r.id)).catch(() => 0);
    results[String(r.id)] = { films: sync?.newFilms ?? 0, alertes, notifiees };
  }
  // Titres traduits des films qui n'en ont pas encore (un paquet par jour suffit pour les nouveaux).
  const titles = await titlesBatch(80).catch(() => null);
  return Response.json({ ok: true, results, titles });
}
