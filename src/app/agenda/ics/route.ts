import { allEvents, toIcs } from "@/lib/agenda";
import { db } from "@/lib/db";

// Abonnement au calendrier d'un membre : webcal://<adresse>/agenda/ics?token=<lien secret>.
// Les applis Calendrier ne peuvent pas se connecter : le jeton secret (propre à chaque membre) remplace la session.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!/^[\w-]{20,}$/.test(token)) return new Response("Lien invalide", { status: 404 });
  const { rows } = await db().execute({ sql: "SELECT id FROM users WHERE calendar_token = ?", args: [token] });
  if (!rows[0]) return new Response("Lien invalide", { status: 404 });
  return new Response(toIcs(await allEvents(Number(rows[0].id)), url.origin), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="dreams-seances.ics"', "Cache-Control": "private, no-store" },
  });
}
