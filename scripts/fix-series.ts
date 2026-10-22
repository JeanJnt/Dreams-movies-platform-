/**
 * Répare les séries Letterboxd prises pour des films (ou restées introuvables).
 *
 *   npx tsx --env-file=.env.local scripts/fix-series.ts
 */
import { fixSeries } from "../src/lib/enrich";

(async () => {
  const r = await fixSeries((line) => console.log("  ✓", line));
  console.log(`✅ ${r.fixed} séries reconnues sur ${r.checked} films vérifiés.`);
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
