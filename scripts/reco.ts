/**
 * Calcule les recommandations d'un membre.
 *
 *   npm run reco -- --email moi@exemple.fr
 *
 * (Aussi disponible dans l'appli : Conseils → « Recalculer mes recommandations ».)
 */
import { setCliUser } from "../src/lib/auth";
import { recoDetails, recoSeeds, recoWatchlistProviders } from "../src/lib/reco-compute";

const email = process.argv[process.argv.indexOf("--email") + 1];
if (!process.argv.includes("--email") || !email) {
  console.error("Usage : npm run reco -- --email moi@exemple.fr");
  process.exit(1);
}

(async () => {
  const user = await setCliUser(email);
  const { seeds, candidates } = await recoSeeds(user.id);
  console.log(`${candidates} films candidats à partir de ${seeds} favoris.`);
  for (let r = await recoDetails(user.id); r.remaining; r = await recoDetails(user.id)) process.stdout.write(`\rDétails restants : ${r.remaining}   `);
  for (let r = await recoWatchlistProviders(user.id); r.remaining; r = await recoWatchlistProviders(user.id)) process.stdout.write(`\rPlateformes de la watchlist : ${r.remaining}   `);
  console.log(`\n✅ Recommandations de ${user.name} à jour.`);
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
