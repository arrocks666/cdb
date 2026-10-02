// lib/firestoreLiveProducts.ts
// Persist live products (from image search) to Firestore so shared URLs work.
// Collections:
//   liveProducts/{id}         — one doc per product (id = "live-XXXXXXXX")
//   live_search_cache/{hash}  — image hash → array of product ids (fast repeat searches)

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit as limitQuery,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { LiveProduct } from "./liveProduct";

const LIVE_COLLECTION = "liveProducts";
const CACHE_COLLECTION = "live_search_cache";

// ---------- SAVE / READ PRODUCTS ----------

/** Save or update a live product. Idempotent — same id updates the doc. */
export async function saveLiveProduct(p: LiveProduct): Promise<void> {
  try {
    const ref = doc(db, LIVE_COLLECTION, p.id);
    const payload = {
      ...p,
      savedAt: serverTimestamp(),
    };
    // Strip undefined values (Firestore rejects them)
    await setDoc(ref, stripUndefined(payload), { merge: true });
  } catch (err) {
    // Never throw — bulk save shouldn't break the UI
    console.error(`[saveLiveProduct] failed for ${p.id}:`, err);
  }
}

/** Save many live products at once (fire-and-forget per product). */
export async function saveLiveProducts(products: LiveProduct[]): Promise<void> {
  await Promise.all(products.map((p) => saveLiveProduct(p)));
}

/** Get a single live product by id. Returns null if not found. */
export async function getLiveProduct(id: string): Promise<LiveProduct | null> {
  try {
    const ref = doc(db, LIVE_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as LiveProduct & { savedAt?: unknown };
    // Strip Firestore metadata
    delete (data as any).savedAt;
    return data;
  } catch (err) {
    console.error(`[getLiveProduct] failed for ${id}:`, err);
    return null;
  }
}

/** Get most recent live products (for the "Recently Found" homepage section). */
export async function getRecentLiveProducts(
  maxResults: number = 20
): Promise<LiveProduct[]> {
  try {
    const q = query(
      collection(db, LIVE_COLLECTION),
      orderBy("savedAt", "desc"),
      limitQuery(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as LiveProduct & { savedAt?: unknown };
      delete (data as any).savedAt;
      return data;
    });
  } catch (err) {
    console.error("[getRecentLiveProducts] failed:", err);
    return [];
  }
}

/** Delete a live product (manual cleanup if needed). */
export async function deleteLiveProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LIVE_COLLECTION, id));
  } catch (err) {
    console.error(`[deleteLiveProduct] failed for ${id}:`, err);
  }
}

// ---------- IMAGE HASH CACHE ----------

/** Store: hash → [productId1, productId2, ...]. Overwrites any previous entry. */
export async function saveSearchCache(
  imageHash: string,
  productIds: string[]
): Promise<void> {
  try {
    const ref = doc(db, CACHE_COLLECTION, imageHash);
    await setDoc(
      ref,
      {
        productIds,
        savedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`[saveSearchCache] failed for ${imageHash}:`, err);
  }
}

/** Get cached product IDs for an image hash. Returns [] if not cached. */
export async function getSearchCache(
  imageHash: string
): Promise<string[]> {
  try {
    const ref = doc(db, CACHE_COLLECTION, imageHash);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as { productIds?: string[] };
    return data.productIds ?? [];
  } catch (err) {
    console.error(`[getSearchCache] failed for ${imageHash}:`, err);
    return [];
  }
}

/** Load full live products for cached ids. Skips any that no longer exist. */
export async function loadCachedProducts(
  productIds: string[]
): Promise<LiveProduct[]> {
  if (productIds.length === 0) return [];
  const results = await Promise.all(productIds.map((id) => getLiveProduct(id)));
  return results.filter((p): p is LiveProduct => p !== null);
}

// ---------- HELPERS ----------

function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return obj;
}