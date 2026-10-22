/**
 * Copie la base locale (data/bobine.db) vers la base Turso en ligne, une seule fois, avant la mise en ligne.
 *
 *   npm run vers-turso
 *
 * Il faut d'abord ajouter dans .env.local :
 *   TURSO_DATABASE_URL=libsql://…turso.io
 *   TURSO_AUTH_TOKEN=…
 * Par sécurité, le script refuse d'écraser une base en ligne qui contient déjà des comptes.
 */
import { createClient } from "@libsql/client";
import { db, ensureSchema } from "../src/lib/db";

(async () => {
  const url = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Ajoute TURSO_DATABASE_URL et TURSO_AUTH_TOKEN dans .env.local");

  // 1. La base locale passe au format « comptes » (si ce n'est pas déjà fait).
  await ensureSchema();
  const local = db();
  const remote = createClient({ url, authToken });

  const existing = await remote.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'");
  if (existing.rows.length) {
    const n = await remote.execute("SELECT COUNT(*) AS n FROM users");
    if (Number(n.rows[0].n) > 0) throw new Error("La base en ligne contient déjà des comptes : copie annulée pour ne rien écraser.");
  }

  // 2. Même structure en ligne (tables, puis index).
  const { rows: objects } = await local.execute(
    "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END",
  );
  for (const o of objects) {
    const sql = String(o.sql).replace(/^CREATE (TABLE|INDEX|UNIQUE INDEX) (?!IF NOT EXISTS)/i, "CREATE $1 IF NOT EXISTS ");
    await remote.execute(sql);
  }

  // 3. Les données, table par table, par paquets. (Pas les sessions ni les essais de connexion.)
  const tables = objects.filter((o) => o.type === "table" && !["sessions", "login_attempts"].includes(String(o.name))).map((o) => String(o.name));
  for (const table of tables) {
    const { rows, columns } = await local.execute(`SELECT * FROM ${table}`);
    if (!rows.length) continue;
    const insert = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
    for (let i = 0; i < rows.length; i += 300) {
      await remote.batch(rows.slice(i, i + 300).map((r) => ({ sql: insert, args: columns.map((c) => r[c] ?? null) })), "write");
      process.stdout.write(`\r${table} : ${Math.min(i + 300, rows.length)}/${rows.length}      `);
    }
    process.stdout.write("\n");
  }
  console.log("✅ Base copiée sur Turso. Crée ensuite ton compte sur le site en ligne : il récupérera tes films.");
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
