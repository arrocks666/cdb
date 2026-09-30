// lib/firestoreSearch.ts
// Search Firestore products by keyword. No Apify. Instant.

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { Product } from "./ProductsContext";

/**
 * Search products in Firestore by keyword.
 * Matches title OR subtitle (case-insensitive).
 * Returns up to `limit` results.
 */
export async function searchFirestoreProducts(
  keyword: string,
  limit: number = 30
): Promise<Product[]> {
  try {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];

    const snap = await getDocs(collection(db, "products"));
    const all: Product[] = snap.docs.map((d) => {
      const data = d.data() as Omit<Product, "id">;
      return { ...data, id: d.id };
    });

    // Filter by keyword in title or subtitle
    const matched = all.filter((p) => {
      const title = (p.title ?? "").toLowerCase();
      const subtitle = (p.subtitle ?? "").toLowerCase();
      return title.includes(q) || subtitle.includes(q);
    });

    // Sort by rating (best first)
    matched.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return matched.slice(0, limit);
  } catch (err) {
    console.error("Error searching Firestore:", err);
    return [];
  }
}

/**
 * Search products in Firestore by category ID.
 * Used for image-search category matching.
 */
export async function getProductsByCategoryFromFirestore(
  categoryId: string,
  limit: number = 30
): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(db, "products"));
    const all: Product[] = snap.docs.map((d) => {
      const data = d.data() as Omit<Product, "id">;
      return { ...data, id: d.id };
    });

    const matched = all.filter((p) => {
      const cat = (p.categoryId ?? "").toLowerCase();
      const sub = (p.subcategoryId ?? "").toLowerCase();
      const target = categoryId.toLowerCase();
      return cat.includes(target) || sub.includes(target);
    });

    matched.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return matched.slice(0, limit);
  } catch (err) {
    console.error("Error fetching category from Firestore:", err);
    return [];
  }
}