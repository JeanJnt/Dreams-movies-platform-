/**
 * Complète les films du catalogue (communs à tous les membres) avec les infos TMDB.
 *
 *   npm run enrich
 */
import { enrichBatch } from "../src/lib/enrich";

(async () => {
  const missing: string[] = [];
  for (let r = await enrichBatch(60); r.done; r = await enrichBatch(60)) {
    missing.push(...r.missing);
    process.stdout.write(`\rFilms restants : ${r.remaining}   `);
  }
  console.log("\n✅ Catalogue à jour.");
  if (missing.length) console.log(`❓ Introuvables sur TMDB (${missing.length}) :\n  ${missing.join("\n  ")}`);
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
