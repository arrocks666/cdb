// lib/imageHashCache.ts
// Cache image search results by image hash.
// Same image uploaded twice → instant result from Firestore.

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import crypto from "crypto";

const COLLECTION = "image_search_cache";
const CACHE_HOURS = 168; // 7 days

/**
 * Hash a base64 image string to a short hex ID.
 */
export function hashImage(base64: string): string {
  return crypto
    .createHash("md5")
    .update(base64)
    .digest("hex")
    .slice(0, 24);
}

export type ImageCacheResult = {
  detectedCategory: string | null;
  productIds: string[];
  cachedAt: number;
};

/**
 * Look up image hash in Firestore cache.
 * Returns null if not found or expired.
 */
export async function getCachedImageResult(
  hash: string
): Promise<ImageCacheResult | null> {
  try {
    const ref = doc(db, COLLECTION, hash);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as {
      detectedCategory?: string | null;
      productIds?: string[];
      cachedAt?: number;
    };

    if (!data.cachedAt) return null;

    const ageHours = (Date.now() - data.cachedAt) / (1000 * 60 * 60);
    if (ageHours > CACHE_HOURS) return null;

    return {
      detectedCategory: data.detectedCategory ?? null,
      productIds: data.productIds ?? [],
      cachedAt: data.cachedAt,
    };
  } catch (err) {
    console.error("Image cache read error:", err);
    return null;
  }
}

/**
 * Save image search result to cache.
 */
export async function saveCachedImageResult(
  hash: string,
  detectedCategory: string | null,
  productIds: string[]
): Promise<void> {
  try {
    const ref = doc(db, COLLECTION, hash);
    await setDoc(ref, {
      detectedCategory,
      productIds,
      cachedAt: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Image cache write error:", err);
  }
}