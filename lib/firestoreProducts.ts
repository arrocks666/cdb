// lib/firestoreProducts.ts
// Firestore CRUD for products

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

export type FirestoreProduct = {
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
  isLive?: boolean;
  isFlashSale?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  views?: number;
};

const COLLECTION = "products";

export async function getAllProducts(): Promise<FirestoreProduct[]> {
  try {
    const q = query(collection(db, COLLECTION));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<FirestoreProduct, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    return [];
  }
}

export async function getProduct(id: string): Promise<FirestoreProduct | null> {
  try {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<FirestoreProduct, "id">;
    return { ...data, id: snap.id };
  } catch (err) {
    console.error("Error fetching product:", err);
    return null;
  }
}

export async function getProductsByCategory(
  categoryId: string
): Promise<FirestoreProduct[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("categoryId", "==", categoryId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<FirestoreProduct, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching category products:", err);
    return [];
  }
}

export async function saveProduct(product: FirestoreProduct): Promise<void> {
  const ref = doc(db, COLLECTION, product.id);
  const existing = await getDoc(ref);

  const data: DocumentData = {
    ...product,
    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    data.createdAt = serverTimestamp();
    data.views = product.views ?? 0;
  }

  if (existing.exists() && existing.data().createdAt) {
    data.createdAt = existing.data().createdAt;
  }

  await setDoc(ref, data, { merge: true });
}

export async function updateProductFields(
  id: string,
  fields: Partial<FirestoreProduct>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function bulkImportProducts(
  products: FirestoreProduct[]
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;
  const BATCH_SIZE = 400;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const product of chunk) {
      try {
        const ref = doc(db, COLLECTION, product.id);
        batch.set(
          ref,
          {
            ...product,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            views: 0,
          },
          { merge: true }
        );
        imported++;
      } catch (err) {
        console.error(`Failed to batch product ${product.id}:`, err);
        failed++;
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error(`Batch commit failed at index ${i}:`, err);
      failed += chunk.length;
      imported -= chunk.length;
    }
  }

  return { imported, failed };
}

export async function getFlashSaleProducts(): Promise<FirestoreProduct[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("isFlashSale", "==", true),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<FirestoreProduct, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching flash sale:", err);
    return [];
  }
}

export async function getTrendingProducts(): Promise<FirestoreProduct[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("isTrending", "==", true),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<FirestoreProduct, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching trending:", err);
    return [];
  }
}

export async function getTopViewedProducts(
  n: number = 10,
  onlyLive: boolean = false
): Promise<FirestoreProduct[]> {
  try {
    const constraints: any[] = [orderBy("views", "desc"), limit(n)];
    if (onlyLive) {
      constraints.unshift(where("isLive", "==", true));
    } else {
      constraints.unshift(where("isLive", "==", false));
    }

    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<FirestoreProduct, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching top viewed:", err);
    return [];
  }
}

export async function getProductsByIds(
  ids: string[]
): Promise<FirestoreProduct[]> {
  if (ids.length === 0) return [];
  try {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
      chunks.push(ids.slice(i, i + 30));
    }

    const allResults: FirestoreProduct[] = [];
    for (const chunk of chunks) {
      const q = query(collection(db, COLLECTION), where("__name__", "in", chunk));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const data = d.data() as Omit<FirestoreProduct, "id">;
        allResults.push({ ...data, id: d.id });
      });
    }

    return allResults;
  } catch (err) {
    console.error("Error fetching products by IDs:", err);
    return [];
  }
}