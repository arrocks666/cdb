// scripts/test-datacach.ts
// Test DataCach actor with 3 keywords.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { scrape1688 } from "../lib/apify-1688";

async function main() {
  const keywords = ["women dress", "men shirt", "tws earbuds"];

  for (const kw of keywords) {
    console.log(`\n=== Testing: "${kw}" ===`);
    try {
      const products = await scrape1688(kw, 3);
      console.log(`Got ${products.length} products`);

      products.forEach((p, i) => {
        console.log(`\n[${i + 1}]`);
        console.log(`  Title: ${p.title.slice(0, 60)}`);
        console.log(`  Price: ¥${p.price}`);
        console.log(`  Offer ID: ${p.offerId}`);
        console.log(`  Image: ${p.imageUrl.slice(0, 60)}...`);
        console.log(`  Sales: ${p.saleQuantity}`);
        console.log(`  Location: ${p.city || p.province || "(none)"}`);
      });
    } catch (err: any) {
      console.error(`FAILED: ${err.message}`);
    }
  }
}

main().catch(console.error);