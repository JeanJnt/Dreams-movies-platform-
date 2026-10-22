import type { NextConfig } from "next";

// En-têtes de sécurité envoyés avec chaque page.
const securityHeaders = [
  // Dreams ne peut pas être affiché dans une page d'un autre site (anti « clickjacking »),
  // et les formulaires ne peuvent être envoyés qu'à Dreams lui-même.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // On n'envoie pas l'adresse complète des pages aux sites extérieurs (TMDB, YouTube, Deezer…)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Seule la caméra est utilisée (scanner de code-barres), et uniquement par Dreams.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Toujours en HTTPS une fois en ligne
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Masque le petit badge de dev de Next.js, qui cachait la navigation sur mobile.
  devIndicators: false,
  // Autorise l'envoi de grosses vidéos dans la galerie d'un film.
  experimental: { serverActions: { bodySizeLimit: "500mb" } },
  // Ne révèle pas la technologie utilisée
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
