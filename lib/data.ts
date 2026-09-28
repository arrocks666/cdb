// lib/data.ts
// Only keeps utility functions now.
// Products are loaded from Firestore via ProductsContext.

export type { Product } from "./ProductsContext";

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