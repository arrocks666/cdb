// lib/firestoreLiveProducts.ts
// Persist live products to Firestore. No version checks.

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

export async function saveLiveProduct(p: LiveProduct): Promise<void> {
  try {
    const ref = doc(db, LIVE_COLLECTION, p.id);
    const payload = {
      ...p,
      savedAt: serverTimestamp(),
    };
    await setDoc(ref, stripUndefined(payload), { merge: true });
  } catch (err) {
    console.error(`[saveLiveProduct] failed for ${p.id}:`, err);
  }
}

export async function saveLiveProducts(products: LiveProduct[]): Promise<void> {
  await Promise.all(products.map((p) => saveLiveProduct(p)));
}

export async function getLiveProduct(id: string): Promise<LiveProduct | null> {
  try {
    const ref = doc(db, LIVE_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as LiveProduct & { savedAt?: unknown };
    delete (data as any).savedAt;
    return data;
  } catch (err) {
    console.error(`[getLiveProduct] failed for ${id}:`, err);
    return null;
  }
}

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

export async function deleteLiveProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LIVE_COLLECTION, id));
  } catch (err) {
    console.error(`[deleteLiveProduct] failed for ${id}:`, err);
  }
}

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

export async function getSearchCache(imageHash: string): Promise<string[]> {
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

export async function loadCachedProducts(
  productIds: string[]
): Promise<LiveProduct[]> {
  if (productIds.length === 0) return [];
  const results = await Promise.all(productIds.map((id) => getLiveProduct(id)));
  return results.filter((p): p is LiveProduct => p !== null);
}

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