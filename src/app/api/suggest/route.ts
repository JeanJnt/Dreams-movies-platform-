import { currentUser } from "@/lib/auth";
import { searchAll } from "@/lib/search";
import { longEnough } from "@/lib/titles";

// Suggestions pendant la frappe (barre de recherche) : quelques films et personnes.
export async function GET(req: Request) {
  if (!(await currentUser())) return new Response("Non autorisé", { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!longEnough(q)) return Response.json({ films: [], people: [] });
  const res = await searchAll(q, { films: 7, people: 3 });
  return Response.json(res, { headers: { "Cache-Control": "private, max-age=60" } });
}
