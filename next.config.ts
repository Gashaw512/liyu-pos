import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",

  // Disable PWA only during local development.
  // Production/Vercel builds generate the service worker.
  disable: process.env.NODE_ENV === "development",

  register: true,
  skipWaiting: true,

  // Keep old caches from interfering with the latest deployment.
  cleanupOutdatedCaches: true,
});

const nextConfig: NextConfig = {
  typedRoutes: true,

  images: {
    formats: ["image/webp"],
  },
};

export default withPWA(nextConfig);