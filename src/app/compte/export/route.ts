import { requireUser } from "@/lib/auth";
import { db, USER_TABLES } from "@/lib/db";

// Export de toutes MES données (jamais celles des autres, jamais le mot de passe).
export async function GET() {
  const me = await requireUser();
  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { name: me.name, email: me.email },
  };
  for (const table of USER_TABLES) {
    const { rows } = await db().execute({ sql: `SELECT * FROM ${table} WHERE user_id = ?`, args: [me.id] });
    data[table] = rows;
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="dreams-${date}.json"`, "Cache-Control": "no-store" },
  });
}
