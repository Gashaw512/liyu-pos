import type { NextConfig } from "next";
import type { RuntimeCaching } from "workbox-build";
import nextPWA from "next-pwa";

// Keep next-pwa's built-in cache strategies unchanged, while using Workbox's
// precache fallback plugin instead of next-pwa's separately imported fallback
// worker script.
const runtimeCaching = (require("next-pwa/cache") as RuntimeCaching[]).map(
  (entry) =>
    entry.options?.cacheName === "others"
      ? {
          ...entry,
          options: {
            ...entry.options,
            precacheFallback: { fallbackURL: "/offline.html" },
          },
        }
      : entry
);

const withPWA = nextPWA({
  dest: "public",

  // Disable PWA only during local development.
  // Production/Vercel builds generate the service worker.
  disable: process.env.NODE_ENV === "development",

  register: true,
  skipWaiting: true,
  inlineWorkboxRuntime: true,
  runtimeCaching,
  // Cache rendered documents reached through Next's client-side navigation.
  cacheOnFrontEndNav: true,

  // Keep old caches from interfering with the latest deployment.
  cleanupOutdatedCaches: true,
});

const nextConfig: NextConfig = {
  typedRoutes: true,

  // Keep failed App Router soft navigations pending while offline and retry
  // them when connectivity returns. Local POS work continues through its
  // existing IndexedDB queue; this does not make protected routes public.
  experimental: {
    useOffline: true,
  },

  images: {
    formats: ["image/webp"],
  },
};

export default withPWA(nextConfig);
