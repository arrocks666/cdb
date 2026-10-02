"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LiveProductCard from "@/components/LiveProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { getRecentLiveProducts } from "@/lib/firestoreLiveProducts";
import type { LiveProduct } from "@/lib/liveProduct";

const PAGE_SIZE = 40;

export default function RecentlyFoundPage() {
  const router = useRouter();
  const [liveProducts, setLiveProducts] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = async (limit: number) => {
    try {
      const list = await getRecentLiveProducts(limit);
      setLiveProducts(list);
      setHasMore(list.length >= limit);
    } catch (err) {
      console.warn("Failed to load live products:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load(PAGE_SIZE).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await load(liveProducts.length + PAGE_SIZE);
    setLoadingMore(false);
  };

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
              <span>🔥</span>
              <span>Recently Found</span>
              <span className="rounded-full bg-red-primary/10 px-2 py-0.5 text-[10px] font-bold text-red-primary md:text-xs">
                LIVE
              </span>
            </h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              Products found by image search
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
        ) : liveProducts.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">📷</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">
              No live products yet
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Search by image to find products on 1688.
            </p>
            <Link
              href="/"
              className="mt-5 rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3 text-xs text-text-secondary md:text-sm">
              Showing <span className="font-bold text-gold-primary">{liveProducts.length}</span> products
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
              {liveProducts.map((p) => (
                <LiveProductCard key={p.id} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full bg-gold-primary px-6 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}