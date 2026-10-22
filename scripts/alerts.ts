/**
 * Cherche, pour chaque membre, les films de sa watchlist et de ses coups de cœur qui sont (ou vont être) au cinéma.
 *
 *   npm run alertes                              → tous les membres
 *   npm run alertes -- --email moi@exemple.fr    → un seul membre
 */
import { fullCheck, quickCheck } from "../src/lib/alerts";
import { setCliUser } from "../src/lib/auth";
import { db, ensureSchema } from "../src/lib/db";

(async () => {
  await ensureSchema();
  const i = process.argv.indexOf("--email");
  const users = i > 0
    ? [await setCliUser(process.argv[i + 1])]
    : (await db().execute("SELECT id, name FROM users")).rows.map((r) => ({ id: Number(r.id), name: String(r.name) }));
  for (const u of users) {
    const quick = await quickCheck(u.id);
    const full = await fullCheck(undefined, u.id);
    console.log(`✅ ${u.name} : ${quick} à l'affiche ou prochainement, ${full} sortie(s) ou ressortie(s).`);
  }
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
