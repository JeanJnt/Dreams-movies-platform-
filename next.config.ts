import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Masque le petit badge de dev de Next.js, qui cachait la navigation sur mobile.
  devIndicators: false,
  // Autorise l'envoi de grosses vidéos dans la galerie d'un film.
  experimental: { serverActions: { bodySizeLimit: "500mb" } },
};

export default nextConfig;
