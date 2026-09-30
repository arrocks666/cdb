// scripts/test-bulk-100.ts
// Test bulk scrape — 10 subcategories × 10 products = ~100 products.
// Saves to Firestore.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { scrape1688 } from "../lib/apify-1688";
import { allSubcategories } from "../lib/categories";
import { translateToEnglish, hasChinese } from "../lib/translation";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CNY_TO_BDT = 17.5;

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
  return 1.10;
}

function countChinese(text: string): number {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

async function transformProduct(
  raw: any,
  categoryId: string,
  subcategoryId: string
) {
  if (!raw.title || !raw.imageUrl || raw.price < 1) return null;

  const englishTitle = await translateToEnglish(raw.title);
  if (!englishTitle) return null;

  // Skip if title still has 2+ Chinese chars
  if (countChinese(englishTitle) > 1) return null;

  let locationEn = "";
  if (raw.city) {
    const t = await translateToEnglish(raw.city);
    if (t && countChinese(t) === 0) locationEn = t;
  }
  if (!locationEn && raw.province) {
    const t = await translateToEnglish(raw.province);
    if (t && countChinese(t) === 0) locationEn = t;
  }

  const priceBDT = raw.price * CNY_TO_BDT;
  const multiplier = markupMultiplier(priceBDT);
  const finalPrice = Math.round(priceBDT * multiplier);
  const oldPrice = Math.round(finalPrice * 1.25);

  return {
    id: raw.offerId,
    title: englishTitle.slice(0, 100),
    subtitle: locationEn ? `${locationEn}, China` : "China",
    price: finalPrice,
    oldPrice,
    discount: 20,
    rating: 4.5,
    reviews: raw.saleQuantity ?? 0,
    image: raw.imageUrl,
    gallery: [raw.imageUrl],
    colors: [{ id: "default", label: "Default", hex: "#000000" }],
    inStock: true,
    stockCount: 999,
    features: [
      { icon: "📍", label: locationEn || "China" },
      { icon: "📦", label: `MOQ ${raw.minOrderQuantity}` },
    ],
    description: englishTitle,
    categoryId,
    subcategoryId,
    sourceUrl: raw.url,
    moq: raw.minOrderQuantity,
    supplierName: locationEn || "China",
    priceOriginalCny: raw.price,
    isLive: false,
    isFlashSale: false,
    isTrending: false,
    isFeatured: false,
    views: 0,
    lastSeenAt: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function main() {
  console.log("=== Test Bulk Scrape (100 products) ===\n");

  const testSubs = allSubcategories.slice(0, 10);
  console.log(`Testing ${testSubs.length} subcategories × 10 products\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  const startTime = Date.now();

  for (let i = 0; i < testSubs.length; i++) {
    const sub = testSubs[i];
    const label = `[${i + 1}/${testSubs.length}] ${sub.name}`;

    try {
      console.log(`${label} — scraping "${sub.keyword}"...`);
      const raw = await scrape1688(sub.keyword, 10);
      console.log(`  → ${raw.length} raw products`);

      let saved = 0;
      let skipped = 0;
      for (const r of raw) {
        const transformed = await transformProduct(r, sub.categoryId, sub.id);
        if (!transformed) {
          skipped++;
          totalSkipped++;
          continue;
        }

        try {
          await setDoc(doc(db, "products", transformed.id), transformed);
          saved++;
          totalSaved++;
        } catch (err: any) {
          console.error(`  Failed to save ${transformed.id}:`, err.message);
        }
      }

      console.log(`  → ${saved} saved, ${skipped} skipped\n`);
    } catch (err: any) {
      console.error(`${label} FAILED: ${err.message}\n`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("================================");
  console.log(`Done in ${duration}s`);
  console.log(`Total saved: ${totalSaved}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log("================================");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});