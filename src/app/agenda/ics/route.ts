import { allEvents, toIcs } from "@/lib/agenda";

// Calendrier de toutes mes séances, au format .ics.
// Sur iPhone : s'abonner à webcal://<adresse>/agenda/ics pour que les séances apparaissent dans Calendrier.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return new Response(toIcs(await allEvents(), origin), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="dreams-seances.ics"' },
  });
}
