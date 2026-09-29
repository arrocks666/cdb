// lib/firestoreAnalytics.ts
// Product view tracking + visitor analytics
// Automatically deletes data older than the current month

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  increment,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const VIEWS_COLLECTION = "product_views";
const VISITORS_COLLECTION = "visitor_stats";

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "cdb_visitor_id";
  const MONTH_KEY = "cdb_visitor_month";

  const currentMonth = getTodayKey().slice(0, 7);
  const storedMonth = localStorage.getItem(MONTH_KEY);

  if (storedMonth !== currentMonth) {
    const newId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, newId);
    localStorage.setItem(MONTH_KEY, currentMonth);
    return newId;
  }

  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export type ProductView = {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productPrice?: number;
  isLive: boolean;
  createdAt: unknown;
};

export async function trackProductView(
  productId: string,
  productTitle: string,
  productImage: string,
  productPrice: number,
  isLive: boolean
): Promise<void> {
  try {
    const viewId = `${productId}_${Date.now()}`;
    const ref = doc(db, VIEWS_COLLECTION, viewId);

    await setDoc(ref, {
      productId,
      productTitle,
      productImage,
      productPrice,
      isLive,
      createdAt: serverTimestamp(),
    });

    const productRef = doc(db, "products", productId);
    try {
      await updateDoc(productRef, { views: increment(1) });
    } catch {
      // Product may not exist in Firestore
    }
  } catch (err) {
    console.error("Error tracking view:", err);
  }
}

export async function getMonthlyViews(
  onlyLive?: boolean
): Promise<ProductView[]> {
  try {
    const monthStart = Timestamp.fromDate(getMonthStart());
    const constraints: any[] = [
      where("createdAt", ">=", monthStart),
      orderBy("createdAt", "desc"),
    ];

    if (typeof onlyLive === "boolean") {
      constraints.unshift(where("isLive", "==", onlyLive));
    }

    const q = query(collection(db, VIEWS_COLLECTION), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<ProductView, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching monthly views:", err);
    return [];
  }
}

export async function getTopViewedThisMonth(
  n: number = 10,
  onlyLive?: boolean
): Promise<
  Array<{
    productId: string;
    productTitle: string;
    productImage: string;
    productPrice?: number;
    isLive: boolean;
    views: number;
  }>
> {
  try {
    const views = await getMonthlyViews(onlyLive);

    const counter = new Map<
      string,
      {
        productId: string;
        productTitle: string;
        productImage: string;
        productPrice?: number;
        isLive: boolean;
        views: number;
      }
    >();

    for (const v of views) {
      const existing = counter.get(v.productId);
      if (existing) {
        existing.views++;
      } else {
        counter.set(v.productId, {
          productId: v.productId,
          productTitle: v.productTitle,
          productImage: v.productImage,
          productPrice: v.productPrice,
          isLive: v.isLive,
          views: 1,
        });
      }
    }

    return Array.from(counter.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, n);
  } catch (err) {
    console.error("Error getting top viewed:", err);
    return [];
  }
}

export type VisitorStat = {
  id: string;
  date: string;
  count: number;
  visitorIds: string[];
  updatedAt: unknown;
};

export async function trackVisit(): Promise<void> {
  try {
    const visitorId = getVisitorId();
    const today = getTodayKey();
    const ref = doc(db, VISITORS_COLLECTION, today);

    const snapshot = await getDocs(
      query(collection(db, VISITORS_COLLECTION), where("__name__", "==", today))
    );

    let currentVisitorIds: string[] = [];
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      if (Array.isArray(data.visitorIds)) {
        currentVisitorIds = data.visitorIds;
      }
    }

    const isNew = !currentVisitorIds.includes(visitorId);

    await setDoc(
      ref,
      {
        date: today,
        count: isNew
          ? currentVisitorIds.length + 1
          : currentVisitorIds.length,
        visitorIds: isNew
          ? [...currentVisitorIds, visitorId]
          : currentVisitorIds,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Error tracking visit:", err);
  }
}

export async function getMonthlyVisitors(): Promise<VisitorStat[]> {
  try {
    const monthStart = getTodayKey().slice(0, 7);
    const q = query(
      collection(db, VISITORS_COLLECTION),
      where("date", ">=", `${monthStart}-01`),
      orderBy("date", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<VisitorStat, "id">;
      return { ...data, id: d.id };
    });
  } catch (err) {
    console.error("Error fetching monthly visitors:", err);
    return [];
  }
}

export async function getTodayVisitors(): Promise<number> {
  try {
    const today = getTodayKey();
    const snap = await getDocs(
      query(collection(db, VISITORS_COLLECTION), where("__name__", "==", today))
    );
    if (snap.empty) return 0;
    const data = snap.docs[0].data();
    return data.count ?? 0;
  } catch (err) {
    console.error("Error fetching today visitors:", err);
    return 0;
  }
}

export async function getMonthlyUniqueVisitors(): Promise<number> {
  try {
    const stats = await getMonthlyVisitors();
    const set = new Set<string>();
    for (const s of stats) {
      for (const id of s.visitorIds ?? []) set.add(id);
    }
    return set.size;
  } catch (err) {
    console.error("Error fetching monthly unique visitors:", err);
    return 0;
  }
}

export async function cleanupOldAnalytics(): Promise<{
  deletedViews: number;
  deletedStats: number;
}> {
  let deletedViews = 0;
  let deletedStats = 0;

  try {
    const monthStart = Timestamp.fromDate(getMonthStart());

    const oldViewsQuery = query(
      collection(db, VIEWS_COLLECTION),
      where("createdAt", "<", monthStart)
    );
    const oldViewsSnap = await getDocs(oldViewsQuery);

    const viewDocs = oldViewsSnap.docs;
    for (let i = 0; i < viewDocs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = viewDocs.slice(i, i + 400);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deletedViews += chunk.length;
    }

    const monthKey = getTodayKey().slice(0, 7);
    const oldStatsSnap = await getDocs(collection(db, VISITORS_COLLECTION));
    const oldStats = oldStatsSnap.docs.filter(
      (d) => !d.id.startsWith(monthKey)
    );

    for (let i = 0; i < oldStats.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = oldStats.slice(i, i + 400);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deletedStats += chunk.length;
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }

  return { deletedViews, deletedStats };
}

export function shouldRunCleanup(): boolean {
  if (typeof window === "undefined") return false;
  const KEY = "cdb_last_cleanup";
  const last = localStorage.getItem(KEY);
  if (!last) return true;

  const lastDate = new Date(parseInt(last, 10));
  const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 25;
}

export function markCleanupDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cdb_last_cleanup", Date.now().toString());
}