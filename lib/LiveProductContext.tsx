"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { LiveProduct } from "./liveProduct";

type LiveProductContextType = {
  save: (product: LiveProduct) => void;
  get: (id: string) => LiveProduct | undefined;
  getAll: () => LiveProduct[];
  clear: () => void;
};

const LiveProductContext = createContext<LiveProductContextType | null>(null);
const STORAGE_KEY = "cdb_live_products";
const MAX_STORED = 100;

export function LiveProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProducts(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch {}
  }, [products, hydrated]);

  const save = (product: LiveProduct) => {
    setProducts((prev) => {
      // ✅ No-op if the same product is already at the front (stops re-render loops)
      if (prev[0]?.id === product.id) return prev;
      const filtered = prev.filter((p) => p.id !== product.id);
      return [product, ...filtered].slice(0, MAX_STORED);
    });
  };

  const get = (id: string) => products.find((p) => p.id === id);
  const getAll = () => products;
  const clear = () => setProducts([]);

  return (
    <LiveProductContext.Provider value={{ save, get, getAll, clear }}>
      {children}
    </LiveProductContext.Provider>
  );
}

export function useLiveProducts() {
  const ctx = useContext(LiveProductContext);
  if (!ctx)
    throw new Error("useLiveProducts must be used inside LiveProductProvider");
  return ctx;
}