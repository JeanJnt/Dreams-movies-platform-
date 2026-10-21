import { NextResponse } from "next/server";
import { ensureFilmFromTmdb } from "@/lib/tmdb-film";

// /tmdb/1234 → crée la fiche du film si besoin, puis ouvre /film/<id>.
export async function GET(req: Request, { params }: { params: Promise<{ tmdbId: string }> }) {
  const tmdbId = Number((await params).tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return new NextResponse("Film introuvable", { status: 404 });
  const id = await ensureFilmFromTmdb(tmdbId);
  return NextResponse.redirect(new URL(`/film/${id}`, req.url));
}
