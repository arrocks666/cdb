"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";

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
  price: number;
  costPrice?: number;
  title?: string;
  image?: string;
  isLive?: boolean;
};

export type Order = {
  id: string;
  userId: string;
  userPhone: string | null;
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
  chinaOrderId?: string;
  adminNotes?: string;
  statusUpdatedAt?: unknown;
};

type OrderContextType = {
  orders: Order[];
  loading: boolean;
  addOrder: (
    order: Omit<Order, "id" | "createdAt" | "status" | "userId" | "userPhone">
  ) => Promise<Order>;
  getOrder: (id: string) => Order | undefined;
  refresh: () => Promise<void>;
  clear: () => void;
};

const OrderContext = createContext<OrderContextType | null>(null);

/**
 * Recursively strip `undefined` values so Firestore doesn't reject the write.
 */
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

/**
 * Generate a 6-digit order ID like "482731".
 * Retries up to 5 times if the ID already exists.
 */
async function generateUniqueOrderId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    // Random 6-digit number, no leading-zero issues
    const id = String(Math.floor(100000 + Math.random() * 900000));
    const ref = doc(db, "orders", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return id;
  }
  // Extremely unlikely fallback — append timestamp fragment
  return String(Date.now()).slice(-6);
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Order, "id">),
      }));
      setOrders(list);
    } catch (err) {
      console.error("Error loading orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchOrders();
      } else {
        setOrders([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [fetchOrders]);

  const addOrder = async (
    draft: Omit<Order, "id" | "createdAt" | "status" | "userId" | "userPhone">
  ): Promise<Order> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Must be logged in to place an order");
    }

    // 6-digit custom ID as the Firestore doc ID
    const orderId = await generateUniqueOrderId();
    const ref = doc(db, "orders", orderId);

    const newOrder: Order = {
      ...draft,
      id: orderId,
      userId: user.uid,
      userPhone: user.phoneNumber ?? null,
      createdAt: Date.now(),
      status: "placed",
    };

    const clean = stripUndefined({
      ...newOrder,
      createdAtServer: serverTimestamp(),
      statusUpdatedAt: serverTimestamp(),
    });

    await setDoc(ref, clean);

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const getOrder = (id: string) => orders.find((o) => o.id === id);

  const refresh = async () => {
    await fetchOrders();
  };

  const clear = () => setOrders([]);

  return (
    <OrderContext.Provider
      value={{ orders, loading, addOrder, getOrder, refresh, clear }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside OrderProvider");
  return ctx;
}

/* Status helpers — used by the Orders screens */
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