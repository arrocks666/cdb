// scripts/convert-og.mjs
// Converts public/og-image.svg → public/og-image.png at 1200x630
// Also converts favicon.svg → favicon.png at 512x512 (fallback for browsers)

import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, "..", "public");

async function convert(svgFile, pngFile, width, height) {
  try {
    const svg = readFileSync(join(publicDir, svgFile));
    await sharp(svg, { density: 300 })
      .resize(width, height, { fit: "contain", background: "#FFFFFF" })
      .png()
      .toFile(join(publicDir, pngFile));
    console.log(`✅ ${svgFile} → ${pngFile} (${width}x${height})`);
  } catch (err) {
    console.error(`❌ Failed to convert ${svgFile}:`, err.message);
  }
}

await convert("og-image.svg", "og-image.png", 1200, 630);
await convert("favicon.svg", "favicon.png", 512, 512);
await convert("favicon.svg", "apple-icon.png", 180, 180);

console.log("\nDone. Check public/ for the new PNG files.");