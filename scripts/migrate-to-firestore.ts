// scripts/migrate-to-firestore.ts
// One-time script: reads data/products-1688.json and uploads all products to Firestore.
// Run with: npx tsx scripts/migrate-to-firestore.ts
//
// Requirements:
// - .env.local must have NEXT_PUBLIC_FIREBASE_* variables set
// - Firestore rules must allow writes to /products (they do per our current rules)

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Missing Firebase config. Make sure NEXT_PUBLIC_FIREBASE_* variables are set in .env.local"
  );
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type JsonProduct = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  colors: { id: string; label: string; hex: string }[];
  inStock: boolean;
  stockCount: number;
  features: { icon: string; label: string }[];
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  sourceUrl?: string;
  moq?: number;
  supplierName?: string;
  priceOriginalCny?: number;
};

const BATCH_SIZE = 400; // Firestore limit is 500; leave headroom

async function main() {
  console.log("=== Firestore Migration ===\n");

  // 1. Read JSON file
  const filePath = path.join(process.cwd(), "data", "products-1688.json");

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error(
      "Run the scraper first (npx tsx scripts/scrape-1688.ts) to generate products."
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const products: JsonProduct[] = JSON.parse(raw);

  console.log(`Found ${products.length} products in JSON file\n`);

  if (products.length === 0) {
    console.error("No products to migrate.");
    process.exit(1);
  }

  // 2. Check which products already exist (to skip duplicates if we've run before)
  console.log("Checking existing products in Firestore...");
  let existingCount = 0;
  const existingIds = new Set<string>();

  for (let i = 0; i < products.length; i += 100) {
    const chunk = products.slice(i, i + 100);
    const checks = await Promise.all(
      chunk.map(async (p) => {
        try {
          const snap = await getDoc(doc(db, "products", p.id));
          return snap.exists() ? p.id : null;
        } catch {
          return null;
        }
      })
    );
    checks.forEach((id) => {
      if (id) {
        existingCount++;
        existingIds.add(id);
      }
    });
  }

  console.log(`Already in Firestore: ${existingCount} products`);
  console.log(`Will import: ${products.length - existingCount} products\n`);

  if (products.length === existingCount) {
    console.log("All products already migrated. Nothing to do.");
    process.exit(0);
  }

  // 3. Import in batches
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE).filter(
      (p) => !existingIds.has(p.id)
    );

    if (chunk.length === 0) continue;

    const batch = writeBatch(db);

    for (const product of chunk) {
      const ref = doc(db, "products", product.id);
      batch.set(
        ref,
        {
          ...product,
          isLive: false,
          isFlashSale: false,
          isTrending: false,
          isFeatured: false,
          views: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    try {
      await batch.commit();
      imported += chunk.length;
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(products.length / BATCH_SIZE);
      console.log(
        `Batch ${batchNum}/${totalBatches} — imported ${chunk.length} products (total: ${imported})`
      );
    } catch (err: any) {
      console.error(`Batch at index ${i} failed:`, err.message);
      failed += chunk.length;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (already existed): ${existingCount}`);
  console.log(`Failed: ${failed}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});