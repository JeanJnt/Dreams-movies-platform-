// Exécuté une fois au démarrage du serveur : crée les tables et colonnes manquantes.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("./lib/db");
    await ensureSchema();
  }
}
