"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/ProductsContext";
import { formatBDT } from "@/lib/data";
import { useWishlist } from "@/lib/WishlistContext";

function hasChinese(text: string | undefined): boolean {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

export default function ProductCard({ product }: { product: Product }) {
  const wishlist = useWishlist();
  const inWishlist = wishlist.has(product.id);
  const [imgFailed, setImgFailed] = useState(false);

  const handleGoToProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/product/${product.id}`;
  };

  const showImage = product.image && !imgFailed;

  const subtitle =
    product.subtitle && !hasChinese(product.subtitle) ? product.subtitle : null;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm transition duration-200 hover:shadow-md">
      <div
        role="button"
        tabIndex={0}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishlist.toggle(product.id);
        }}
        className={`absolute right-2 top-2 z-20 flex h-8 w-8 cursor-pointer select-none items-center justify-center rounded-full transition ${
          inWishlist
            ? "bg-red-primary text-white"
            : "bg-white/90 text-text-muted hover:bg-red-primary hover:text-white"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" style={{ pointerEvents: "none" }}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>

      <Link href={`/product/${product.id}`} className="block flex-1">
        <div className="relative aspect-square flex items-center justify-center overflow-hidden rounded-md m-2" style={{ backgroundColor: "#F9F9F9" }}>
          {showImage ? (
            <img
              src={product.image}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain p-2"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-5xl md:text-6xl">📦</span>
            </div>
          )}
          {product.discount > 0 && (
            <span className="absolute left-2 top-2 rounded bg-red-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
              -{product.discount}%
            </span>
          )}
        </div>

        <div className="p-2.5 md:p-3">
          <h3 className="text-[12px] font-medium leading-tight text-text-primary line-clamp-2 min-h-[32px] md:text-[13px]">
            {product.title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[10px] text-text-muted line-clamp-1 md:text-[11px]">
              {subtitle}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1 text-[10px] md:text-[11px]">
            <span className="text-gold-primary">★</span>
            <span className="text-text-secondary">{(product.rating ?? 4.5).toFixed(1)}</span>
            <span className="text-text-muted">({product.reviews ?? 0})</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-red-primary md:text-lg">
              {formatBDT(product.price)}
            </span>
            {product.oldPrice > product.price && (
              <span className="text-[10px] text-text-muted line-through md:text-[11px]">
                {formatBDT(product.oldPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-auto px-2.5 pb-2.5 md:px-3 md:pb-3">
        <button
          onClick={handleGoToProduct}
          disabled={!product.inStock}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold-primary py-2 text-[11px] font-semibold text-white transition hover:bg-gold-luxury disabled:cursor-not-allowed disabled:opacity-40 md:text-[12px]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {product.inStock ? "Order Now" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
}