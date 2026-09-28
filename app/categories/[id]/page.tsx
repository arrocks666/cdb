"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProducts } from "@/lib/ProductsContext";
import { categories } from "@/lib/categories";
import ProductGrid from "@/components/ProductGrid";

export default function SubcategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { products, loading } = useProducts();
  const category = categories.find((c) => c.id === id);
  const [activeSub, setActiveSub] = useState<string>("all");

  if (!category) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="text-6xl opacity-40">🗂️</div>
          <h1 className="mt-4 text-xl font-bold text-text-primary">Category not found</h1>
          <Link href="/categories" className="mt-5 inline-block rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow">Back to Categories</Link>
        </div>
      </div>
    );
  }

  const categoryProducts = products.filter((p) => {
    if (p.categoryId !== id) return false;
    if (activeSub === "all") return true;
    return p.subcategoryId === activeSub;
  });

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/categories")} aria-label="Back" className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none text-text-primary md:text-xl">{category.name}</h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">{categoryProducts.length} products</p>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1800px] gap-2 overflow-x-auto px-4 pb-2">
          <button
            onClick={() => setActiveSub("all")}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${activeSub === "all" ? "border-gold-primary bg-gold-primary text-white" : "border-border-subtle bg-white text-text-secondary hover:border-gold-primary hover:text-gold-primary"}`}
          >
            All
          </button>
          {category.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSub(sub.id)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${activeSub === sub.id ? "border-gold-primary bg-gold-primary text-white" : "border-border-subtle bg-white text-text-secondary hover:border-gold-primary hover:text-gold-primary"}`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-4 md:py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
          </div>
        ) : categoryProducts.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">📦</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">No products yet</h3>
            <button onClick={() => setActiveSub("all")} className="mt-5 rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow">Show All</button>
          </div>
        ) : (
          <ProductGrid products={categoryProducts} />
        )}
      </div>
    </div>
  );
}