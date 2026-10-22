import { currentUser } from "@/lib/auth";
import { searchAll } from "@/lib/search";
import { longEnough } from "@/lib/titles";

// Suggestions pendant la frappe (barre de recherche) : quelques films et personnes.
export async function GET(req: Request) {
  if (!(await currentUser())) return new Response("Non autorisé", { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!longEnough(q)) return Response.json({ films: [], people: [] });
  // ?films=10 : plus de films et pas de personnes (sélecteur de films)
  const many = Math.min(Number(url.searchParams.get("films")) || 0, 20);
  const res = await searchAll(q, many ? { films: many, people: 0 } : { films: 7, people: 3 });
  return Response.json(res, { headers: { "Cache-Control": "private, max-age=60" } });
}
