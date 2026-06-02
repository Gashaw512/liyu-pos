import type { NextConfig } from 'next'
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const nextConfig: NextConfig = {
  // Keeps your routes strictly typed for fewer bugs
  typedRoutes: true, 
  
  images: { 
    formats: ['image/webp'] 
  },
  
  // Removed the experimental turbopack block since you are using --webpack explicitly
}

module.exports = withPWA(nextConfig)