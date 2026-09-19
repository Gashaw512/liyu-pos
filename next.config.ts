import type { NextConfig } from "next";
import nextPWA from "next-pwa";

// Initialize next-pwa wrapper cleanly with strict type handling
const withPWA = nextPWA({
  dest: "public",
  // Keeps local 'npm run dev' fast and free from caching issues,
  // but compiles perfectly on Vercel deployment builds.
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  // Enables strictly-typed routing paths across your layout
  typedRoutes: true,

  // Performance optimization for high-density POS image files
  images: {
    formats: ["image/webp"],
  },
};

// Export configuration by wrapping it with PWA engine compiler
export default withPWA(nextConfig as any) as NextConfig;
