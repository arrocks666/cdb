"use client";

import { useState, useEffect } from "react";
import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import FlashSaleStrip from "@/components/FlashSaleStrip";
import ProductGrid from "@/components/ProductGrid";
import LiveProductCard from "@/components/LiveProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { useProducts } from "@/lib/ProductsContext";
import { getRecentLiveProducts } from "@/lib/firestoreLiveProducts";
import type { LiveProduct } from "@/lib/liveProduct";

export default function HomePage() {
  const { products, loading } = useProducts();
  const [liveProducts, setLiveProducts] = useState<LiveProduct[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRecentLiveProducts(20)
      .then((list) => {
        if (!cancelled) setLiveProducts(list);
      })
      .catch((err) => {
        console.warn("Failed to load recent live products:", err);
      })
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trending = products.filter((p) => p.isTrending === true);
  const hasLiveProducts = liveProducts.length > 0;

  return (
    <div className="bg-bg-secondary">
      <HeroBanner />
      <CategoryStrip />
      <FlashSaleStrip />

      {/* Recently Found — Live Products */}
      {(liveLoading || hasLiveProducts) && (
        <section className="bg-white px-4 py-4 md:py-6">
          <div className="mx-auto max-w-[1800px]">
            <div className="mb-3 flex items-center justify-between md:mb-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-text-primary md:text-xl">
                <span>🔥</span>
                <span>Recently Found</span>
                <span className="rounded-full bg-red-primary/10 px-2 py-0.5 text-[10px] font-bold text-red-primary md:text-xs">
                  LIVE
                </span>
              </h2>
              <a
                href="/recently-found"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-primary transition hover:text-gold-muted md:text-sm"
              >
                See All →
              </a>
            </div>

            {liveLoading ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ProductSkeleton key={`live-skel-${i}`} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
                {liveProducts.map((p) => (
                  <LiveProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trending */}
      <section className="bg-white px-4 py-4 md:py-6">
        <div className="mx-auto max-w-[1800px]">
          <div className="mb-3 flex items-center justify-between md:mb-5">
            <h2 className="text-base font-bold text-text-primary md:text-xl">
              Trending Products
            </h2>
            <a href="/trending" className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-primary transition hover:text-gold-muted md:text-sm">
              See All →
            </a>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
            </div>
          ) : trending.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-bg-input py-16 text-center">
              <div className="text-5xl opacity-40">🔥</div>
              <h3 className="mt-3 text-base font-bold text-text-primary md:text-lg">
                Trending products coming soon
              </h3>
              <p className="mt-1 max-w-xs text-xs text-text-muted md:text-sm">
                Check back soon for our featured picks.
              </p>
            </div>
          ) : (
            <ProductGrid products={trending} />
          )}
        </div>
      </section>

      <section className="bg-white px-4 py-5 md:py-8">
        <div className="mx-auto max-w-[1800px]">
          <h2 className="mb-3 text-base font-bold text-text-primary md:mb-5 md:text-xl">
            Why ChinaDailyBazar
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <FeatureCard icon="✅" title="Authentic Products" desc="Sourced directly from verified Chinese suppliers" />
            <FeatureCard icon="🔒" title="Secure Payment" desc="bKash, Nagad, Card, or Cash on Delivery" />
            <FeatureCard icon="🚚" title="Fast & Reliable Shipping" desc="Delivered across Bangladesh in 7–15 days" />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-white p-3.5 shadow-card-dark md:p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bg-orange text-xl">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
      </div>
    </div>
  );
}