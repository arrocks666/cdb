"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProducts } from "@/lib/ProductsContext";
import WishlistCard from "@/components/WishlistCard";
import LiveProductCard from "@/components/LiveProductCard";
import { useWishlist } from "@/lib/WishlistContext";

export default function WishlistPage() {
  const router = useRouter();
  const wishlist = useWishlist();
  const { products } = useProducts();

  const localItems = products.filter((p) => wishlist.ids.includes(p.id));
  const liveItems = wishlist.liveItems;
  const totalCount = localItems.length + liveItems.length;

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <Link href="/" aria-label="Back" className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none text-text-primary md:text-xl">My Wishlist</h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              {totalCount} {totalCount === 1 ? "Item" : "Items"}
            </p>
          </div>
          {totalCount > 0 && (
            <button
              aria-label="Clear wishlist"
              onClick={() => wishlist.clear()}
              className="flex h-8 w-8 items-center justify-center text-text-secondary transition hover:text-red-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-4 md:py-6">
        {totalCount === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">♡</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">Your wishlist is empty</h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">Tap the heart on any product to save it here for later.</p>
            <button onClick={() => router.push("/")} className="mt-5 rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow">
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
            {localItems.map((p) => (
              <WishlistCard key={`local-${p.id}`} product={p} />
            ))}
            {liveItems.map((p) => (
              <LiveProductCard key={`live-${p.id}`} product={p as any} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}