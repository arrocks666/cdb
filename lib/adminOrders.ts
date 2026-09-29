// lib/adminOrders.ts
// Admin-only Firestore queries for orders.
// Reads orders collection and provides revenue/status aggregations.

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Order, OrderStatus } from "./OrderContext";

// =============================================
// DATE HELPERS
// =============================================

export function startOfDay(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function startOfWeek(d: Date = new Date()): number {
  // Week starts Monday
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

export function startOfMonth(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function endOfDay(d: Date = new Date()): number {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
}

// =============================================
// FETCHING
// =============================================

/**
 * Fetch all orders newer than `sinceMs`.
 * Defaults to last 30 days.
 */
export async function fetchOrdersSince(sinceMs?: number): Promise<Order[]> {
  try {
    const cutoff = sinceMs ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", cutoff),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Order, "id">),
    }));
  } catch (err) {
    console.error("Error fetching admin orders:", err);
    return [];
  }
}

/**
 * Fetch orders in a date range.
 */
export async function fetchOrdersBetween(
  fromMs: number,
  toMs: number
): Promise<Order[]> {
  try {
    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", fromMs),
      where("createdAt", "<=", toMs),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Order, "id">),
    }));
  } catch (err) {
    console.error("Error fetching orders between dates:", err);
    return [];
  }
}

// =============================================
// SEARCH
// =============================================

/**
 * Filter orders by a search term.
 * Matches: order ID, customer phone, China Order ID, customer name.
 * Case-insensitive substring match.
 */
export function searchOrders(orders: Order[], term: string): Order[] {
  const t = term.trim().toLowerCase();
  if (!t) return orders;

  return orders.filter((o) => {
    const idMatch = o.id.toLowerCase().includes(t);
    const phoneMatch =
      (o.address?.phone ?? "").toLowerCase().includes(t) ||
      (o.userPhone ?? "").toLowerCase().includes(t);
    const chinaMatch = (o.chinaOrderId ?? "").toLowerCase().includes(t);
    const nameMatch = (o.address?.name ?? "").toLowerCase().includes(t);
    return idMatch || phoneMatch || chinaMatch || nameMatch;
  });
}

// =============================================
// AGGREGATIONS
// =============================================

export type OrderStats = {
  count: number;
  revenue: number;
  aov: number;
};

export function computeStats(orders: Order[]): OrderStats {
  const count = orders.length;
  const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const aov = count > 0 ? revenue / count : 0;
  return { count, revenue, aov };
}

export function countByStatus(orders: Order[]): Record<OrderStatus, number> {
  const base: Record<OrderStatus, number> = {
    placed: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    arrived: 0,
    "out-for-delivery": 0,
    delivered: 0,
  };
  for (const o of orders) {
    if (o.status in base) base[o.status]++;
  }
  return base;
}

export function groupByDay(
  orders: Order[]
): Array<{ date: string; revenue: number; count: number }> {
  const map = new Map<string, { revenue: number; count: number }>();

  for (const o of orders) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    const existing = map.get(key) ?? { revenue: 0, count: 0 };
    existing.revenue += o.total ?? 0;
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// =============================================
// FORMATTING
// =============================================

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString("en-IN")}`;
}