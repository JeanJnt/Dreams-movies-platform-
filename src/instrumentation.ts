// Exécuté au démarrage du serveur : crée les tables et colonnes manquantes.
// Une erreur passagère (réseau, autre serveur qui démarre en même temps) ne doit pas bloquer le serveur :
// chaque page refera la vérification au besoin.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSchema } = await import("./lib/db");
    await ensureSchema().catch((e) => console.error("Vérification de la base au démarrage :", e));
  }
}
