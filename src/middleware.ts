import { NextResponse, type NextRequest } from "next/server";

// Première barrière : sans cookie de session, toute page renvoie vers la connexion.
// (La vraie vérification de la session, en base, est faite ensuite par chaque page et chaque action.)
const PUBLIC = ["/connexion", "/inscription", "/hors-ligne", "/agenda/ics", "/manifest.webmanifest", "/sw.js"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (req.cookies.get("dreams_session")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/connexion";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Toutes les routes sauf les fichiers statiques (scripts, icônes…)
  matcher: ["/((?!_next/|icon|apple-icon|favicon|.*\\.(?:png|svg|jpg|ico|webmanifest)$).*)"],
};
