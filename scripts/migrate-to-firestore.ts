// scripts/migrate-to-firestore.ts
// Import products from JSON to Firestore.
// - Adds/updates lastSeenAt timestamp
// - Deletes products with lastSeenAt > 30 days (unless flagged)
// - Never touches orders, analytics
//
// Run: npx tsx scripts/migrate-to-firestore.ts

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  writeBatch,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
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

const BATCH_SIZE = 400;
const DAY_MS = 24 * 60 * 60 * 1000;
const PRODUCT_MAX_AGE_DAYS = 30;

type JsonProduct = {
  id: string;
  [key: string]: any;
};

async function importProducts(products: JsonProduct[]): Promise<{
  imported: number;
  failed: number;
}> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const product of chunk) {
      try {
        const ref = doc(db, "products", product.id);
        batch.set(
          ref,
          {
            ...product,
            isLive: false,
            // Preserve flags — set defaults only if not present
            isFlashSale: product.isFlashSale ?? false,
            isTrending: product.isTrending ?? false,
            isFeatured: product.isFeatured ?? false,
            views: product.views ?? 0,
            lastSeenAt: Date.now(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        imported++;
      } catch (err) {
        console.error(`Failed to prepare product ${product.id}:`, err);
        failed++;
      }
    }

    try {
      await batch.commit();
      console.log(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${chunk.length} products)`
      );
    } catch (err) {
      console.error(`Batch commit failed at index ${i}:`, err);
      failed += chunk.length;
      imported -= chunk.length;
    }
  }

  return { imported, failed };
}

/**
 * Delete products where lastSeenAt > 30 days old
 * AND they are not flagged (isFlashSale, isTrending, isFeatured)
 */
async function cleanupOldProducts(): Promise<{
  deleted: number;
  protected: number;
}> {
  const cutoff = Date.now() - PRODUCT_MAX_AGE_DAYS * DAY_MS;
  let deleted = 0;
  let protectedCount = 0;

  const snap = await getDocs(collection(db, "products"));
  const toDelete: string[] = [];

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const lastSeen = d.lastSeenAt ?? d.updatedAt?.toMillis?.() ?? 0;

    // Never delete flagged products
    if (d.isFlashSale || d.isTrending || d.isFeatured) {
      protectedCount++;
      continue;
    }

    // Delete if not seen in 30 days
    if (lastSeen > 0 && lastSeen < cutoff) {
      toDelete.push(docSnap.id);
    }
  }

  // Delete in batches
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((id) => batch.delete(doc(db, "products", id)));
    await batch.commit();
    deleted += chunk.length;
  }

  return { deleted, protected: protectedCount };
}

async function main() {
  console.log("=== Firestore Migration ===\n");

  const filePath = path.join(process.cwd(), "data", "products-1688.json");

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error("Run: npx tsx scripts/scrape-1688.ts");
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const products: JsonProduct[] = JSON.parse(raw);

  console.log(`Found ${products.length} products in JSON file\n`);

  if (products.length === 0) {
    console.error("No products to migrate.");
    process.exit(1);
  }

  // 1. Import / update products
  console.log("Importing products...");
  const result = await importProducts(products);
  console.log(`\nImported/updated: ${result.imported}`);
  console.log(`Failed: ${result.failed}\n`);

  // 2. Cleanup old products
  console.log(`Cleaning up products not seen in ${PRODUCT_MAX_AGE_DAYS} days...`);
  const cleanup = await cleanupOldProducts();
  console.log(`Deleted: ${cleanup.deleted}`);
  console.log(`Protected (flagged): ${cleanup.protected}\n`);

  console.log("=== Migration Complete ===");
  console.log(`Imported: ${result.imported}`);
  console.log(`Deleted: ${cleanup.deleted}`);
  console.log(`Failed: ${result.failed}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});