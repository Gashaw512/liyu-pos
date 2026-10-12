import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",

  // Disable PWA only during local development.
  // Production/Vercel builds generate the service worker.
  disable: process.env.NODE_ENV === "development",

  register: true,
  skipWaiting: true,
  // Cache rendered documents reached through Next's client-side navigation.
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: '/offline.html',
    image: '',
    audio: '',
    video: '',
    font: '',
  },

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
