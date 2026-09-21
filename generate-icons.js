const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join(__dirname, "public", "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

/*
 * Liyu POS PWA Icon
 *
 * Brand colors:
 * - Berbere 500: #8B2635
 * - Berbere 900: #310D13
 * - Gold 400:    #E2A03F
 * - Gold 500:    #C8852A
 * - Cream 100:   #F7F4EB
 *
 * The SVG is rendered to real PNG files so browsers can
 * reliably use them as PWA manifest icons.
 */

const svgIcon = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 512 512"
  width="512"
  height="512"
>
  <defs>
    <!-- Deep Berbere background -->
    <linearGradient
      id="berbereGrad"
      x1="0%"
      y1="0%"
      x2="100%"
      y2="100%"
    >
      <stop offset="0%" stop-color="#8B2635" />
      <stop offset="100%" stop-color="#310D13" />
    </linearGradient>

    <!-- Gold accent -->
    <linearGradient
      id="goldGrad"
      x1="0%"
      y1="0%"
      x2="100%"
      y2="100%"
    >
      <stop offset="0%" stop-color="#E2A03F" />
      <stop offset="100%" stop-color="#C8852A" />
    </linearGradient>
  </defs>

  <!-- App background -->
  <rect
    width="512"
    height="512"
    rx="112"
    fill="url(#berbereGrad)"
  />

  <!-- Main Liyu POS mark -->
  <g transform="translate(24 24)">

    <!-- Gold L / growth path -->
    <path
      d="M140 100
         V320
         Q140 364 184 364
         H340"
      fill="none"
      stroke="url(#goldGrad)"
      stroke-width="44"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- POS data bars -->
    <path
      d="M210 190 H340"
      fill="none"
      stroke="#F7F4EB"
      stroke-width="36"
      stroke-linecap="round"
    />

    <path
      d="M210 270 H300"
      fill="none"
      stroke="#F7F4EB"
      stroke-width="36"
      stroke-linecap="round"
    />

    <!-- Growth indicator -->
    <circle
      cx="340"
      cy="100"
      r="22"
      fill="#E2A03F"
    />

  </g>
</svg>
`;

async function generateIcon(size, filename) {
  const outputPath = path.join(iconsDir, filename);

  await sharp(Buffer.from(svgIcon))
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toFile(outputPath);

  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

async function main() {
  try {
    await generateIcon(192, "icon-192x192.png");
    await generateIcon(512, "icon-512x512.png");

    console.log("");
    console.log("Liyu POS PWA icons generated successfully.");
    console.log(`Location: ${iconsDir}`);
  } catch (error) {
    console.error("Failed to generate Liyu POS icons:");
    console.error(error);
    process.exit(1);
  }
}

main();

