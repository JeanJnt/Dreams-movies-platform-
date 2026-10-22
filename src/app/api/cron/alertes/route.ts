import { quickCheck } from "@/lib/alerts";
import { db, ensureSchema } from "@/lib/db";

// Tâche planifiée (voir vercel.json) : chaque matin, met à jour les alertes « au cinéma » de chaque membre.
// Vercel l'appelle avec le secret CRON_SECRET ; sans lui, la route refuse.
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Non autorisé", { status: 401 });
  await ensureSchema();
  const { rows } = await db().execute("SELECT id FROM users");
  const results: Record<string, number> = {};
  for (const r of rows) results[String(r.id)] = await quickCheck(Number(r.id)).catch(() => -1);
  return Response.json({ ok: true, results });
}
