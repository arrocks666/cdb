// lib/firestoreOrders.ts
// Firestore CRUD for orders.

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
  serverTimestamp,
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
  colorLabel?: string;
  size?: string;
  quantity: number;
  price: number;
  costPrice?: number;
  title?: string;
  image?: string;
  adminPhoto?: string;
  isLive?: boolean;
};

export type Order = {
  id: string;
  userId: string;
  userPhone?: string;
  createdAt: number;
  createdAtServer?: unknown;
  updatedAt?: unknown;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  costTotal?: number;
  profit?: number;
  paymentMethod: string;
  status: OrderStatus;
  address: {
    name: string;
    phone: string;
    address: string;
    district: string;
  };
  transactionId?: string;
  paidAmount?: number;
  dueAmount?: number;
  paymentScreenshots?: string[];
  chinaOrderId?: string;
  adminNotes?: string;
  statusUpdatedAt?: unknown;
};

const COLLECTION = "orders";

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

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Order, "id">),
    }));
  } catch (err) {
    console.error("Error fetching user orders:", err);
    return [];
  }
}

export async function getAllOrders(since?: number): Promise<Order[]> {
  try {
    const cutoff = since ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    const q = query(
      collection(db, COLLECTION),
      where("createdAt", ">=", cutoff),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Order, "id">),
    }));
  } catch (err) {
    console.error("Error fetching all orders:", err);
    return [];
  }
}

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
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Order, "id">),
    }));
  } catch (err) {
    console.error("Error fetching orders between dates:", err);
    return [];
  }
}

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

export function startOfDay(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function startOfWeek(d = new Date()): number {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff).getTime();
}

export function startOfMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}