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
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

export type Product = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  colors: { id: string; label: string; hex: string }[];
  inStock: boolean;
  stockCount: number;
  features: { icon: string; label: string }[];
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  sourceUrl?: string;
  moq?: number;
  supplierName?: string;
  priceOriginalCny?: number;
  isLive?: boolean;
  isFlashSale?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  views?: number;
};

type ProductsContextType = {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getById: (id: string) => Product | undefined;
  getByCategory: (categoryId: string) => Product[];
  getFlashSale: () => Product[];
  getTrending: () => Product[];
};

const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const snap = await getDocs(collection(db, "products"));
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, "id">),
      }));

      // Sort: trending first, then flash sale, then by rating
      list.sort((a, b) => {
        if (a.isTrending && !b.isTrending) return -1;
        if (!a.isTrending && b.isTrending) return 1;
        if (a.isFlashSale && !b.isFlashSale) return -1;
        if (!a.isFlashSale && b.isFlashSale) return 1;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });

      setProducts(list);
    } catch (err: any) {
      console.error("Error loading products:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const getById = (id: string) => products.find((p) => p.id === id);
  const getByCategory = (categoryId: string) =>
    products.filter((p) => p.categoryId === categoryId);
  const getFlashSale = () => products.filter((p) => p.isFlashSale === true);
  const getTrending = () => products.filter((p) => p.isTrending === true);

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        refresh: fetchProducts,
        getById,
        getByCategory,
        getFlashSale,
        getTrending,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside ProductsProvider");
  return ctx;
}