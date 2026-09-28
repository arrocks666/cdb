"use client";

import { Product } from "@/lib/ProductsContext";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  const unique: Product[] = [];

  for (const p of products) {
    if (seenIds.has(p.id)) continue;
    if (p.image && seenImages.has(p.image)) continue;
    seenIds.add(p.id);
    if (p.image) seenImages.add(p.image);
    unique.push(p);
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
      {unique.map((p) => (
        <ProductCard key={`${p.id}-${p.image}`} product={p} />
      ))}
    </div>
  );
}