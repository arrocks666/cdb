// scripts/scrape-1688.ts
// CLI wrapper around lib/scrape-server.ts
// Run: npx tsx scripts/scrape-1688.ts

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { scrapeAllSubcategories } from "../lib/scrape-server";

async function main() {
  console.log("=== 1688 Scrape ===\n");
  const startTime = Date.now();

  const result = await scrapeAllSubcategories((p) => {
    console.log(
      `[${p.current}/${p.total}] ${p.subcategory} — fetched ${p.fetched}, kept ${p.kept}, skipped ${p.skipped}`
    );
  });

  // Save JSON
  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "products-1688.json");
  fs.writeFileSync(outPath, JSON.stringify(result.products, null, 2));

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n================================");
  console.log(`Done in ${duration}s`);
  console.log(`Total fetched: ${result.totalFetched}`);
  console.log(`Total kept (English only): ${result.totalKept}`);
  console.log(`Total skipped (untranslatable): ${result.totalSkipped}`);
  console.log(`Errors: ${result.errors.length}`);
  if (result.errors.length > 0) {
    console.log("\nError details:");
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }
  console.log(`Output: ${outPath}`);
  console.log("================================");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});