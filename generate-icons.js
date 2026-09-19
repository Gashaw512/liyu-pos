// generate-icons.js
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Ultra-premium icon layout constructed explicitly around your token colors
const svgIcon = `<svg xmlns="http://w3.org" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient transitioning into your deep Berbere reds -->
    <linearGradient id="berbereGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B2635" /> <!-- berbere.500 (PRIMARY) -->
      <stop offset="100%" stop-color="#310d13" /> <!-- berbere.900 -->
    </linearGradient>
    
    <!-- Accent Gradient utilizing your brand Gold tokens -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2A03F" /> <!-- gold.400 (SECONDARY) -->
      <stop offset="100%" stop-color="#c8852a" /> <!-- gold.500 -->
    </linearGradient>
  </defs>

  <!-- Smooth Rounded App Canvas Base (Matches your design radii strategy) -->
  <rect width="512" height="512" rx="112" fill="url(#berbereGrad)"/>

  <!-- Minimalist Geometric Wrapper mimicking an elegant POS Terminal interface -->
  <g transform="translate(24, 24)">
    <!-- Elegant Gold accent trace vector (L-shape / Growth trend symbol) -->
    <path d="M140 100 V320 Q140 364 184 364 H340" fill="none" stroke="url(#goldGrad)" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Clean, crisp background lines matching your brand Cream.100 -->
    <path d="M210 190 H340" fill="none" stroke="#F7F4EB" stroke-width="36" stroke-linecap="round"/>
    <path d="M210 270 H300" fill="none" stroke="#F7F4EB" stroke-width="36" stroke-linecap="round"/>
    
    <!-- Soft Decorative Premium Indicator Dot using Gold -->
    <circle cx="340" cy="100" r="22" fill="#E2A03F" />
  </g>
</svg>`;

// Write your brand-compliant PWA image assets directly into the designated path
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.svg'), svgIcon);
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.svg'), svgIcon);

console.log('🚀 Perfect Custom Liyu POS Brand Icons generated successfully inside public/icons/!');
