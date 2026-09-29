// scripts/cleanup-old-data.ts
// Daily cleanup:
//  - Products not seen in 30 days (unless flagged)
//  - Live search cached products older than 7 days
//  - Analytics (product_views, visitor_stats) older than current month
//
// Run: npx tsx scripts/cleanup-old-data.ts

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  where,
  Timestamp,
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

function getMonthStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/**
 * Delete products not seen in 30 days (unless flagged)
 */
async function cleanupOldProducts(): Promise<{
  deleted: number;
  protected: number;
}> {
  const cutoff = Date.now() - 30 * DAY_MS;
  let deleted = 0;
  let protectedCount = 0;

  const snap = await getDocs(collection(db, "products"));
  const toDelete: string[] = [];

  for (const docSnap of snap.docs) {
    const d = docSnap.data();

    if (d.isFlashSale || d.isTrending || d.isFeatured) {
      protectedCount++;
      continue;
    }

    const lastSeen = d.lastSeenAt ?? 0;
    if (lastSeen > 0 && lastSeen < cutoff) {
      toDelete.push(docSnap.id);
    }
  }

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((id) => batch.delete(doc(db, "products", id)));
    await batch.commit();
    deleted += chunk.length;
  }

  return { deleted, protected: protectedCount };
}

/**
 * Delete live-search cached products older than 7 days.
 * Live products have `isLive: true` and `lastSeenAt`.
 */
async function cleanupOldLiveProducts(): Promise<number> {
  const cutoff = Date.now() - 7 * DAY_MS;
  let deleted = 0;

  const snap = await getDocs(collection(db, "products"));
  const toDelete: string[] = [];

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    if (!d.isLive) continue;

    // Don't delete flagged live products either
    if (d.isFlashSale || d.isTrending || d.isFeatured) continue;

    const lastSeen = d.lastSeenAt ?? 0;
    if (lastSeen > 0 && lastSeen < cutoff) {
      toDelete.push(docSnap.id);
    }
  }

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((id) => batch.delete(doc(db, "products", id)));
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

/**
 * Delete product_views older than current month.
 */
async function cleanupOldViews(): Promise<number> {
  const monthStart = Timestamp.fromDate(new Date(getMonthStart()));
  let deleted = 0;

  try {
    const q = query(
      collection(db, "product_views"),
      where("createdAt", "<", monthStart)
    );
    const snap = await getDocs(q);

    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const chunk = snap.docs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += chunk.length;
    }
  } catch (err: any) {
    // Likely missing index. Skip silently — will retry next day.
    console.warn(`  Views cleanup skipped: ${err.message?.slice(0, 100)}`);
  }

  return deleted;
}

/**
 * Delete visitor_stats not starting with current month (YYYY-MM).
 */
async function cleanupOldVisitors(): Promise<number> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let deleted = 0;

  const snap = await getDocs(collection(db, "visitor_stats"));
  const toDelete = snap.docs.filter((d) => !d.id.startsWith(monthKey));

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
}

async function main() {
  console.log("=== Daily Cleanup ===\n");
  const startTime = Date.now();

  console.log("1. Cleaning up old products (>30 days, unflagged)...");
  const products = await cleanupOldProducts();
  console.log(`   Deleted: ${products.deleted}, Protected: ${products.protected}\n`);

  console.log("2. Cleaning up live cached products (>7 days)...");
  const live = await cleanupOldLiveProducts();
  console.log(`   Deleted: ${live}\n`);

  console.log("3. Cleaning up old product views...");
  const views = await cleanupOldViews();
  console.log(`   Deleted: ${views}\n`);

  console.log("4. Cleaning up old visitor stats...");
  const visitors = await cleanupOldVisitors();
  console.log(`   Deleted: ${visitors}\n`);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== Done in ${duration}s ===`);
  console.log(`Total deleted:`);
  console.log(`  Products: ${products.deleted}`);
  console.log(`  Live cached: ${live}`);
  console.log(`  Views: ${views}`);
  console.log(`  Visitors: ${visitors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});