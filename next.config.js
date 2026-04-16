/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdf-parse reads a test file at require time; point to the lib entry directly
    config.resolve.alias["pdf-parse"] = require.resolve(
      "pdf-parse/lib/pdf-parse.js",
    );
    return config;
  },
  images: {
    remotePatterns: [
      // Open Food Facts — public CDN with real product photos.
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "static.openfoodfacts.org" },
      // Auchan product photos (when the operator wants to use their CDN).
      { protocol: "https", hostname: "www.auchan.fr" },
      { protocol: "https", hostname: "media.auchan.fr" },
    ],
  },
};

module.exports = nextConfig;
