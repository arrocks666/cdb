// lib/searchCache.ts
// Cache search results in Firestore for 24 hours.

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { LiveProduct } from "./live-search";

const COLLECTION = "search_cache";
const CACHE_HOURS = 24;

function keyToId(keyword: string): string {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 100);
}

export async function getCachedSearch(
  keyword: string
): Promise<LiveProduct[] | null> {
  try {
    const id = keyToId(keyword);
    if (!id) return null;

    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as {
      products?: LiveProduct[];
      cachedAt?: number;
    };

    if (!data.products || !data.cachedAt) return null;

    const ageHours = (Date.now() - data.cachedAt) / (1000 * 60 * 60);
    if (ageHours > CACHE_HOURS) {
      return null;
    }

    return data.products;
  } catch (err) {
    console.error("Cache read error:", err);
    return null;
  }
}

export async function saveCachedSearch(
  keyword: string,
  products: LiveProduct[]
): Promise<void> {
  try {
    const id = keyToId(keyword);
    if (!id || products.length === 0) return;

    const ref = doc(db, COLLECTION, id);
    await setDoc(
      ref,
      {
        keyword: keyword.toLowerCase().trim(),
        products,
        cachedAt: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: false }
    );
  } catch (err) {
    console.error("Cache write error:", err);
  }
}