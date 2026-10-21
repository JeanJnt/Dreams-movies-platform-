/**
 * Cherche les films de ma watchlist et de mes coups de cœur qui sont (ou vont être) au cinéma en France.
 *
 *   npm run alertes
 *
 * À lancer régulièrement (une fois en ligne, ce sera automatique chaque matin).
 */
import { fullCheck, quickCheck } from "../src/lib/alerts";

(async () => {
  const quick = await quickCheck();
  console.log(`À l'affiche / prochainement : ${quick} film(s) de tes listes.`);
  const full = await fullCheck((done, total) => {
    if (done % 50 === 0 || done === total) process.stdout.write(`\rSorties et ressorties : ${done}/${total}`);
  });
  console.log(`\n✅ ${full} film(s) avec une sortie ou ressortie en salle autour d'aujourd'hui.`);
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
