"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type CartItem = {
  productId: string;
  colorId: string;
  quantity: number;
  // Snapshot data for live products (not in products.json)
  isLive?: boolean;
  liveSnapshot?: {
    id: string;
    title: string;
    subtitle?: string;
    price: number;
    oldPrice: number;
    discount: number;
    image: string;
    rating: number;
    reviews: number;
    description: string;
    sourceUrl?: string;
    moq?: number;
    supplierName?: string;
    priceOriginalCny?: number;
  };
};

type CartContextType = {
  items: CartItem[];
  add: (productId: string, colorId: string, quantity?: number) => void;
  addLive: (
    product: {
      id: string;
      title: string;
      subtitle?: string;
      price: number;
      oldPrice: number;
      discount: number;
      image: string;
      rating: number;
      reviews: number;
      description: string;
      sourceUrl?: string;
      moq?: number;
      supplierName?: string;
      priceOriginalCny?: number;
    },
    colorId: string,
    quantity?: number
  ) => void;
  remove: (productId: string, colorId: string) => void;
  updateQty: (productId: string, colorId: string, quantity: number) => void;
  clear: () => void;
  totalCount: number;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "cdb_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add = (productId: string, colorId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find(
        (x) => x.productId === productId && x.colorId === colorId
      );
      if (existing) {
        return prev.map((x) =>
          x.productId === productId && x.colorId === colorId
            ? { ...x, quantity: x.quantity + quantity }
            : x
        );
      }
      return [...prev, { productId, colorId, quantity }];
    });
  };

  const addLive = (
    product: {
      id: string;
      title: string;
      subtitle?: string;
      price: number;
      oldPrice: number;
      discount: number;
      image: string;
      rating: number;
      reviews: number;
      description: string;
      sourceUrl?: string;
      moq?: number;
      supplierName?: string;
      priceOriginalCny?: number;
    },
    colorId: string,
    quantity = 1
  ) => {
    setItems((prev) => {
      const existing = prev.find(
        (x) =>
          x.productId === product.id &&
          x.colorId === colorId &&
          x.isLive === true
      );
      if (existing) {
        return prev.map((x) =>
          x.productId === product.id &&
          x.colorId === colorId &&
          x.isLive === true
            ? { ...x, quantity: x.quantity + quantity }
            : x
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          colorId,
          quantity,
          isLive: true,
          liveSnapshot: {
            id: product.id,
            title: product.title,
            subtitle: product.subtitle,
            price: product.price,
            oldPrice: product.oldPrice,
            discount: product.discount,
            image: product.image,
            rating: product.rating,
            reviews: product.reviews,
            description: product.description,
            sourceUrl: product.sourceUrl,
            moq: product.moq,
            supplierName: product.supplierName,
            priceOriginalCny: product.priceOriginalCny,
          },
        },
      ];
    });
  };

  const remove = (productId: string, colorId: string) => {
    setItems((prev) =>
      prev.filter(
        (x) => !(x.productId === productId && x.colorId === colorId)
      )
    );
  };

  const updateQty = (productId: string, colorId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((x) =>
        x.productId === productId && x.colorId === colorId
          ? { ...x, quantity }
          : x
      )
    );
  };

  const clear = () => setItems([]);
  const totalCount = items.reduce((sum, x) => sum + x.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, add, addLive, remove, updateQty, clear, totalCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}