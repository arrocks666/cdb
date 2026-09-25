import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import FlashSaleStrip from "@/components/FlashSaleStrip";
import ProductGrid from "@/components/ProductGrid";
import { products } from "@/lib/data";

export default function HomePage() {
  // Show only top 25 trending products on home (sorted by rating)
  const trending = [...products]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 50);

  return (
    <div>
      <HeroBanner />
      <CategoryStrip />
      <FlashSaleStrip />

      {/* Trending Products */}
      <section className="px-4 py-4 md:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex items-center justify-between md:mb-5">
            <h2 className="font-serif text-base font-bold md:text-2xl">
              <span className="gold-text">Trending Products</span>
            </h2>
            <a
              href="/categories"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-primary transition hover:text-gold-luxury md:text-sm"
            >
              See All
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
          <ProductGrid products={trending} />
        </div>
      </section>

      {/* Why ChinaDailyBazar */}
      <section className="px-4 py-5 md:py-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-3 font-serif text-base font-bold md:mb-5 md:text-2xl">
            <span className="gold-text">Why ChinaDailyBazar</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
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
    <div className="flex items-start gap-3 rounded-xl border border-gold-primary/40 bg-bg-card p-3.5 shadow-card-dark md:p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bg-card-elevated text-xl">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gold-primary">{title}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
      </div>
    </div>
  );
}