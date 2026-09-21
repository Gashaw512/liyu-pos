import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",

  // Keep development fast and avoid service-worker caching locally.
  // PWA is enabled automatically for production builds.
  disable: process.env.NODE_ENV === "development",

  // Automatically register the generated service worker.
  register: true,

  // Activate the newest service worker immediately.
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  // Keep Next.js typed routes enabled.
  typedRoutes: true,

  // Optimize product/menu images for the POS.
  images: {
    formats: ["image/webp"],
  },
};

export default withPWA(nextConfig);