import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  typedRoutes: true,

  images: {
    formats: ["image/webp"],
  },
};

export default withPWA(nextConfig);