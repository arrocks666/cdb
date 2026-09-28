// lib/firestoreOrders.ts
// Firestore CRUD for orders.
// Customer orders live here forever (never deleted).
// Admin panel shows last 30 days, but full history stays in Firestore.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "arrived"
  | "out-for-delivery"
  | "delivered";

export type OrderItem = {
  productId: string;
  colorId: string;
  quantity: number;
  price: number;        // selling price per unit in BDT (what customer paid)
  costPrice?: number;   // admin-only: cost price per unit in BDT
  title?: string;       // snapshot for order history display
  image?: string;       // snapshot
  isLive?: boolean;     // was this a live-search product?
};

export type Order = {
  id: string;
  userId: string;                 // Firebase Auth uid of customer
  userPhone?: string;             // snapshot for admin display
  createdAt: number;              // epoch ms (kept for fast sorting)
  createdAtServer?: unknown;      // server timestamp (Firestore)
  updatedAt?: unknown;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  costTotal?: number;             // admin-only: sum of costPrice × qty
  profit?: number;                // admin-only: total - costTotal - shipping
  paymentMethod: string;
  status: OrderStatus;
  address: {
    name: string;
    phone: string;
    address: string;
    district: string;
  };
  // Admin-only fields
  chinaOrderId?: string;          // 1688 order ID for tracking
  adminNotes?: string;            // internal notes
  statusUpdatedAt?: unknown;
};

const COLLECTION = "orders";

/**
 * Create a new order in Firestore. Called from checkout.
 * Returns the generated order ID.
 */
export async function createOrder(
  draft: Omit<Order, "id" | "createdAt" | "createdAtServer" | "status">
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const orderId = ref.id;

  const data: Record<string, unknown> = {
    ...draft,
    id: orderId,
    createdAt: Date.now(),
    createdAtServer: serverTimestamp(),
    status: "placed",
    statusUpdatedAt: serverTimestamp(),
  };

  await setDoc(ref, data);
  return orderId;
}

/**
 * Fetch a single order by ID.
 */
export async function getOrder(id: string): Promise<Order | null> {
  try {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Order, "id">) };
  } catch (err) {
    console.error("Error fetching order:", err);
    return null;
  }
}

/**
 * Fetch all orders for a specific user, newest first.
 * Customer-facing — shows full history.
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
  } catch (err) {
    console.error("Error fetching user orders:", err);
    return [];
  }
}

/**
 * Fetch all orders (admin) — optional date range.
 * If no `since` given, returns last 30 days.
 */
export async function getAllOrders(since?: number): Promise<Order[]> {
  try {
    const cutoff = since ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    const q = query(
      collection(db, COLLECTION),
      where("createdAt", ">=", cutoff),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
  } catch (err) {
    console.error("Error fetching all orders:", err);
    return [];
  }
}

/**
 * Fetch orders within a date range (admin analytics).
 */
export async function getOrdersBetween(
  fromMs: number,
  toMs: number
): Promise<Order[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("createdAt", ">=", fromMs),
      where("createdAt", "<=", toMs),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) }));
  } catch (err) {
    console.error("Error fetching orders between dates:", err);
    return [];
  }
}

/**
 * Update order status (admin). Also stamps statusUpdatedAt.
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    status,
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update arbitrary admin fields (chinaOrderId, adminNotes, etc).
 */
export async function updateOrderFields(
  id: string,
  fields: Partial<Order>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fill in cost price for order items (admin) and compute profit.
 * `itemCosts` is a map: itemIndex → costPrice per unit.
 */
export async function setOrderCosts(
  id: string,
  order: Order,
  itemCosts: Record<number, number>
): Promise<void> {
  const updatedItems = order.items.map((item, idx) => ({
    ...item,
    costPrice: itemCosts[idx] ?? item.costPrice ?? 0,
  }));

  const costTotal = updatedItems.reduce(
    (sum, it) => sum + (it.costPrice ?? 0) * it.quantity,
    0
  );
  const profit = order.total - costTotal - order.shipping;

  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    items: updatedItems,
    costTotal,
    profit,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Aggregate revenue + profit for a set of orders.
 */
export function aggregateOrders(orders: Order[]): {
  count: number;
  revenue: number;
  cost: number;
  profit: number;
} {
  let revenue = 0;
  let cost = 0;
  let profit = 0;

  for (const o of orders) {
    revenue += o.total;
    if (typeof o.costTotal === "number") cost += o.costTotal;
    if (typeof o.profit === "number") profit += o.profit;
  }

  return { count: orders.length, revenue, cost, profit };
}

/**
 * Status helpers (mirrors the customer-side OrderContext so pages stay compatible).
 */
export const STATUS_ORDER: OrderStatus[] = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "arrived",
  "out-for-delivery",
  "delivered",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order Placed",
  confirmed: "Payment Confirmed",
  processing: "Processing in China",
  shipped: "Shipped to Bangladesh",
  arrived: "Arrived in Bangladesh",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
};

/**
 * Helper — start of day / week / month in ms.
 */
export function startOfDay(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function startOfWeek(d = new Date()): number {
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff).getTime();
}

export function startOfMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}