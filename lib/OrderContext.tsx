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

export type OrderPayment = {
  id: string;
  amount: number;
  date: number;
  note?: string;
  addedBy?: string;
};

export type OrderCharges = {
  chinaLocalCourier?: number;
  shippingCharge?: number;
  bdCourier?: number;
  shippingWeightKg?: number;
  shippingRatePerKg?: number;
  showChinaLocalCourier?: boolean;
  showShippingCharge?: boolean;
  showBdCourier?: boolean;
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

  transactionId?: string;
  paidAmount?: number;
  dueAmount?: number;
  paymentScreenshots?: string[];
  payments?: OrderPayment[];

  // ✅ Legacy single China order id (kept for backward compat)
  chinaOrderId?: string;
  // ✅ NEW — multiple China order ids
  chinaOrderIds?: string[];

  adminNotes?: string;
  statusUpdatedAt?: unknown;

  charges?: OrderCharges;
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

async function generateUniqueOrderId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = String(Math.floor(100000 + Math.random() * 900000));
    const ref = doc(db, "orders", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return id;
  }
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

    const orderId = await generateUniqueOrderId();
    const ref = doc(db, "orders", orderId);

    const total = draft.total;
    const paidAmount = draft.paidAmount ?? total;
    const dueAmount = Math.max(0, total - paidAmount);

    const initialPayments: OrderPayment[] = [];
    if (paidAmount > 0) {
      initialPayments.push({
        id: `p_${Date.now()}_init`,
        amount: paidAmount,
        date: Date.now(),
        note: draft.transactionId ? `TXN: ${draft.transactionId}` : undefined,
        addedBy: "customer",
      });
    }

    const newOrder: Order = {
      ...draft,
      id: orderId,
      userId: user.uid,
      userPhone: user.phoneNumber ?? null,
      createdAt: Date.now(),
      status: "placed",
      paidAmount,
      dueAmount,
      payments: initialPayments,
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