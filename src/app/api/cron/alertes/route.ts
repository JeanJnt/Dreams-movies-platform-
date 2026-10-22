import { quickCheck } from "@/lib/alerts";
import { db, ensureSchema } from "@/lib/db";
import { titlesBatch } from "@/lib/enrich";
import { syncLetterboxd } from "@/lib/letterboxd-sync";

// Tâche planifiée (voir vercel.json) : chaque matin, pour chaque membre,
// récupère ses nouveaux films Letterboxd puis met à jour ses alertes « au cinéma ».
// Vercel l'appelle avec le secret CRON_SECRET ; sans lui, la route refuse.
// Jusqu'à 5 minutes : Paris Ciné Info est interrogé lentement (une pause entre chaque film).
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Non autorisé", { status: 401 });
  await ensureSchema();
  const { rows } = await db().execute("SELECT id, letterboxd_username FROM users");
  const results: Record<string, { films: number; alertes: number }> = {};
  for (const r of rows) {
    const sync = r.letterboxd_username ? await syncLetterboxd(Number(r.id)).catch(() => null) : null;
    results[String(r.id)] = { films: sync?.newFilms ?? 0, alertes: await quickCheck(Number(r.id), 150).catch(() => -1) };
  }
  // Titres traduits des films qui n'en ont pas encore (un paquet par jour suffit pour les nouveaux).
  const titles = await titlesBatch(80).catch(() => null);
  return Response.json({ ok: true, results, titles });
}
