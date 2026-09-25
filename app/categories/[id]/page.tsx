"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { products } from "@/lib/data";
import ProductGrid from "@/components/ProductGrid";

const displayNames: Record<string, string> = {
  mobile: "Mobile & Accessories",
  "womens-fashion": "Women's Fashion",
  "mens-fashion": "Men's Fashion",
  beauty: "Beauty & Personal Care",
  "home-kitchen": "Home & Kitchen",
  electronics: "Electronics & Gadgets",
  "baby-kids": "Baby, Kids & Toys",
  more: "All Products",
};

export default function SubcategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const categoryProducts = products.filter((p) => p.categoryId === id);
  const title = displayNames[id] ?? "Category";

  return (
    <div>
      <div className="sticky top-[100px] z-40 border-b border-border-subtle bg-bg-base/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/categories")}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-lg font-bold leading-none md:text-xl">
              <span className="gold-text">{title}</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              {categoryProducts.length} products
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
        {categoryProducts.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="text-6xl opacity-60">📦</div>
            <h3 className="mt-4 font-serif text-lg font-bold">
              <span className="gold-text">No products yet</span>
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              This category will fill up after the next scrape.
            </p>
            <button
              onClick={() => router.push("/categories")}
              className="mt-5 rounded-full bg-red-primary px-6 py-2.5 text-xs font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
            >
              Browse Categories
            </button>
          </div>
        ) : (
          <ProductGrid products={categoryProducts} />
        )}
      </div>
    </div>
  );
}