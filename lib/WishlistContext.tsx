"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type LiveWishlistItem = {
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
  isLive: true;
};

type WishlistContextType = {
  ids: string[];
  liveItems: LiveWishlistItem[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleLive: (item: LiveWishlistItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

const STORAGE_KEY = "cdb_wishlist";
const LIVE_STORAGE_KEY = "cdb_wishlist_live";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [liveItems, setLiveItems] = useState<LiveWishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));

      const rawLive = localStorage.getItem(LIVE_STORAGE_KEY);
      if (rawLive) setLiveItems(JSON.parse(rawLive));
    } catch {}
    setHydrated(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(liveItems));
    } catch {}
  }, [ids, liveItems, hydrated]);

  const has = (id: string) =>
    ids.includes(id) || liveItems.some((x) => x.id === id);

  const toggle = (id: string) => {
    // If it's a live item, remove it from liveItems
    if (liveItems.some((x) => x.id === id)) {
      setLiveItems((prev) => prev.filter((x) => x.id !== id));
      return;
    }
    // Otherwise toggle in local ids
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleLive = (item: LiveWishlistItem) => {
    setLiveItems((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      if (exists) return prev.filter((x) => x.id !== item.id);
      return [...prev, { ...item, isLive: true }];
    });
  };

  const remove = (id: string) => {
    // Remove from both stores
    setIds((prev) => prev.filter((x) => x !== id));
    setLiveItems((prev) => prev.filter((x) => x.id !== id));
  };

  const clear = () => {
    setIds([]);
    setLiveItems([]);
  };

  const count = ids.length + liveItems.length;

  return (
    <WishlistContext.Provider
      value={{
        ids,
        liveItems,
        has,
        toggle,
        toggleLive,
        remove,
        clear,
        count,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}