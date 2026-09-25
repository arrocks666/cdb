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

function dedupe(rawProducts: Product[]): Product[] {
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  const unique: Product[] = [];

  for (const p of rawProducts) {
    // Skip if we already saw this product ID
    if (seenIds.has(p.id)) continue;

    // Skip if the image is empty or invalid
    if (!p.image || !p.image.startsWith("http")) continue;

    // Skip if we already used this exact image
    if (seenImages.has(p.image)) continue;

    seenIds.add(p.id);
    seenImages.add(p.image);
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