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
  // Count how many times each image appears
  const imageCount = new Map<string, number>();
  for (const p of rawProducts) {
    if (p.image) {
      imageCount.set(p.image, (imageCount.get(p.image) || 0) + 1);
    }
  }

  // Images used by more than 3 products are likely placeholders — skip them
  const placeholderImages = new Set<string>();
  imageCount.forEach((count, img) => {
    if (count > 3) placeholderImages.add(img);
  });

  const unique: Product[] = [];
  for (const p of rawProducts) {
    if (seenIds.has(p.id)) continue;
    if (p.image && seenImages.has(p.image)) continue;
    // Skip products whose image is a known placeholder
    if (p.image && placeholderImages.has(p.image)) continue;
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