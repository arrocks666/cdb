"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProducts } from "@/lib/ProductsContext";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";

export default function FlashSalePage() {
  const router = useRouter();
  const { products, loading } = useProducts();

  const flashProducts = products.filter((p) => p.isFlashSale === true);

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center text-text-primary hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-lg font-bold leading-none text-text-primary md:text-xl">
              <span>⚡</span>
              <span>Flash Sale</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              {flashProducts.length} {flashProducts.length === 1 ? "product" : "products"} on sale
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-4 md:py-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductSkeleton key={`skel-${i}`} />
            ))}
          </div>
        ) : flashProducts.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">⚡</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">
              No flash sale products right now
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Check back soon for limited-time deals.
            </p>
            <Link
              href="/"
              className="mt-5 rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
            {flashProducts.map((p) => (
              <ProductCard key={`${p.id}-${p.image}`} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}