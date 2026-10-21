import { NextResponse } from "next/server";
import { findPerson, type Role } from "@/lib/people";

// /personne?nom=Akira%20Kurosawa&role=director → retrouve la personne sur TMDB et ouvre sa page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("nom")?.trim();
  const role = url.searchParams.get("role") as Role | null;
  if (!name) return NextResponse.redirect(new URL("/personnes", req.url));
  const person = await findPerson(name, role ?? undefined);
  if (!person) return new NextResponse(`Personne introuvable : ${name}`, { status: 404 });
  return NextResponse.redirect(new URL(`/personne/${person.id}`, req.url));
}
