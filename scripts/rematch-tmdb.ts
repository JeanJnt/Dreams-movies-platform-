/**
 * Répare les films reliés au mauvais film TMDB (ancienne recherche trop naïve).
 *
 *   npx tsx --env-file=.env.local scripts/rematch-tmdb.ts
 */
import { rematchSuspects } from "../src/lib/enrich";

(async () => {
  const r = await rematchSuspects((line) => console.log("  ✓", line), process.argv.includes("--tous"));
  console.log(`✅ ${r.fixed} films corrigés sur ${r.checked} vérifiés.`);
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
