import { db, ensureSchema } from "@/lib/db";
import { picks } from "@/lib/reco";

// Les conseils d'un membre pour sa TV (Free My TV) : https://<adresse>/api/tv?token=<lien secret>.
// Une TV ne peut pas se connecter : le jeton secret de l'agenda (propre à chaque membre) remplace la session,
// comme pour /agenda/ics. On ne renvoie que des films à voir, jamais les critiques ni les notes du membre.
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, max-age=600",
  // La TV ouvre l'appli depuis un fichier local (origine « null ») : elle doit pouvoir lire la réponse.
  "Access-Control-Allow-Origin": "*",
};

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[\w-]{20,}$/.test(token)) return Response.json({ error: "Lien invalide" }, { status: 404, headers: HEADERS });
  await ensureSchema();
  const { rows } = await db().execute({ sql: "SELECT id FROM users WHERE calendar_token = ?", args: [token] });
  if (!rows[0]) return Response.json({ error: "Lien invalide" }, { status: 404, headers: HEADERS });
  const u = Number(rows[0].id);

  // « Pour toi » (favoris + profil de goût), puis la watchlist : seulement ce qui est sur mes plateformes.
  const [forYou, watchlist] = await Promise.all([picks({ mode: "pour-toi" }, u), picks({ mode: "watchlist" }, u)]);
  const lite = (list: typeof forYou.picks) =>
    list.filter((p) => p.tmdbId).slice(0, 20).map((p) => ({
      tmdbId: p.tmdbId, title: p.title, year: p.year, posterPath: p.posterPath, runtime: p.runtime, genres: p.genres,
      directors: p.directors, platforms: p.platforms.map((x) => x.name), reasons: p.reasons, match: p.match,
    }));
  return Response.json({ forYou: lite(forYou.picks), watchlist: lite(watchlist.picks) }, { headers: HEADERS });
}
