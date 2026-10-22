// Lien entre le site et l'appli Android (Trusted Web Activity) : sans ce fichier, Android afficherait une barre d'adresse.
// L'empreinte SHA-256 de la clé de signature de l'APK est donnée par PWABuilder, à mettre dans ANDROID_SHA256 (Vercel).
export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: process.env.ANDROID_PACKAGE ?? "app.dreams.journal", sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
