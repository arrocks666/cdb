"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { products } from "@/lib/data";
import WishlistCard from "@/components/WishlistCard";
import { useWishlist } from "@/lib/WishlistContext";

export default function WishlistPage() {
  const router = useRouter();
  const wishlist = useWishlist();

  // Get the real products from the wishlist IDs
  const wishlistItems = products.filter((p) => wishlist.ids.includes(p.id));

  return (
    <div>
      {/* Top bar */}
      <div className="sticky top-[100px] z-40 border-b border-border-subtle bg-bg-base/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <div className="flex-1">
            <h1 className="font-serif text-lg font-bold leading-none md:text-xl">
              <span className="gold-text">My Wishlist</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              {wishlistItems.length} {wishlistItems.length === 1 ? "Item" : "Items"}
            </p>
          </div>

          {wishlistItems.length > 0 && (
            <button
              aria-label="Clear wishlist"
              onClick={() => wishlist.clear()}
              className="flex h-8 w-8 items-center justify-center text-gold-primary transition hover:text-red-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
            {wishlistItems.map((p) => (
              <WishlistCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="text-6xl opacity-60">♡</div>
            <h3 className="mt-4 font-serif text-lg font-bold">
              <span className="gold-text">Your wishlist is empty</span>
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Tap the heart on any product to save it here for later.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-5 rounded-full bg-red-primary px-6 py-2.5 text-xs font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
            >
              Browse Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}