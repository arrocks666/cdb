// lib/liveProduct.ts
// Canonical home for LiveProduct types.
// This replaces the type exports from lib/live-search.ts (deprecated Zen scraper).
//
// Files that should import from here instead of "@/lib/live-search":
//   - lib/image-search.ts
//   - lib/LiveProductContext.tsx
//   - app/live-product/[id]/page.tsx
//   - components/LiveProductCard.tsx
//   - app/admin-panel/orders/new/page.tsx
//   - app/search/page.tsx
//   - components/ImageSearchModal.tsx

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
};