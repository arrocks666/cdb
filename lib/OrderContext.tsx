"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "arrived"
  | "out-for-delivery"
  | "delivered";

export type Order = {
  id: string;
  createdAt: number;
  items: {
    productId: string;
    colorId: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  address: {
    name: string;
    phone: string;
    address: string;
    district: string;
  };
};

type OrderContextType = {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "createdAt" | "status">) => Order;
  getOrder: (id: string) => Order | undefined;
  clear: () => void;
};

const OrderContext = createContext<OrderContextType | null>(null);

const STORAGE_KEY = "cdb_orders";

function generateOrderId() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `CDB${num}`;
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch {}
  }, [orders, hydrated]);

  const addOrder = (draft: Omit<Order, "id" | "createdAt" | "status">) => {
    const newOrder: Order = {
      ...draft,
      id: generateOrderId(),
      createdAt: Date.now(),
      status: "placed",
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const getOrder = (id: string) => orders.find((o) => o.id === id);

  const clear = () => setOrders([]);

  return (
    <OrderContext.Provider value={{ orders, addOrder, getOrder, clear }}>
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