/**
 * Importe un export Letterboxd (.zip) dans le compte d'un membre, puis complète les films avec TMDB.
 *
 *   npm run import -- "C:\chemin\vers\letterboxd-xxx.zip" --email moi@exemple.fr
 *
 * (Le plus simple reste de passer par l'appli : Mon compte → Importer depuis Letterboxd.)
 */
import fs from "node:fs";
import { setCliUser } from "../src/lib/auth";
import { enrichBatch } from "../src/lib/enrich";
import { importLetterboxd } from "../src/lib/importer";

const args = process.argv.slice(2);
const email = args[args.indexOf("--email") + 1];
const zip = args.find((a) => a.endsWith(".zip"));
if (!zip || !args.includes("--email") || !email) {
  console.error('Usage : npm run import -- "chemin/vers/export.zip" --email moi@exemple.fr');
  process.exit(1);
}

(async () => {
  const user = await setCliUser(email);
  const s = await importLetterboxd(user.id, fs.readFileSync(zip));
  console.log(`✅ Import pour ${user.name} : ${s.watched} vus · ${s.ratings} notes · ${s.likes} coups de cœur · ${s.diary} entrées de journal · ${s.reviews} critiques · ${s.watchlist} en watchlist · ${s.lists} listes`);
  for (let r = await enrichBatch(60); r.done; r = await enrichBatch(60)) process.stdout.write(`\rFilms à compléter avec TMDB : ${r.remaining}   `);
  console.log("\n✅ Catalogue à jour.");
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
