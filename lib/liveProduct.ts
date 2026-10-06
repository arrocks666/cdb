// lib/liveProduct.ts
// Canonical home for LiveProduct types.

export type LiveProductColor = {
  id: string;
  label: string;
  hex: string;
  image?: string;
};

export type LiveProductVariant = {
  colorId?: string;
  size?: string;
  priceCny?: number;
  price?: number;
  stock?: number;
  image?: string;
  skuId?: string;
  specId?: string;
};

export type LiveProduct = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  priceMax?: number;
  priceCnyMin?: number;
  priceCnyMax?: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  colors: LiveProductColor[];
  sizes: string[];
  variants?: LiveProductVariant[];
  specs?: { name: string; value: string }[];
  videoUrl?: string;
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
  weightKg?: number;
  skuPrices?: {
    [specId: string]: {
      priceCny: number;
      discountPriceCny: number;
      stock?: number;
    };
  };
  // ✅ NEW — timestamp of last 1688 re-check (ms since epoch)
  lastRefreshedAt?: number;
};