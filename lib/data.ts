// lib/data.ts
import productsData from "../data/products.json";

export type ColorOption = {
  id: string;
  label: string;
  hex: string;
};

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
  colors: ColorOption[];
  inStock: boolean;
  stockCount: number;
  features: { icon: string; label: string }[];
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  sourceUrl?: string;
  moq?: number;
  supplierName?: string;
};

// Dedupe by ID AND by image URL (removes visual duplicates)
function dedupe(rawProducts: Product[]): Product[] {
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  const unique: Product[] = [];

  for (const p of rawProducts) {
    if (seenIds.has(p.id)) continue;
    if (p.image && seenImages.has(p.image)) continue;
    seenIds.add(p.id);
    if (p.image) seenImages.add(p.image);
    unique.push(p);
  }

  return unique;
}

export const products: Product[] = dedupe(productsData as Product[]);

export const categories = [
  { id: "electronics", name: "Electronics", icon: "📱" },
  { id: "fashion", name: "Fashion", icon: "👕" },
  { id: "home", name: "Home & Living", icon: "🏠" },
  { id: "beauty", name: "Beauty", icon: "💄" },
  { id: "shoes", name: "Shoes", icon: "👟" },
  { id: "bags", name: "Bags", icon: "👜" },
  { id: "jewelry", name: "Jewelry", icon: "💍" },
  { id: "more", name: "More", icon: "⋯" },
];

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString("en-IN")}`;
}