"use client";

import { useState } from "react";
import Link from "next/link";
import { Product, formatBDT } from "@/lib/data";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";

function proxyImage(url: string | undefined | null): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export default function WishlistCard({ product }: { product: Product }) {
  const wishlist = useWishlist();
  const cart = useCart();
  const [imgFailed, setImgFailed] = useState(false);

  const handleAddToCart = () => {
    const defaultColorId = product.colors[0]?.id ?? "default";
    cart.add(product.id, defaultColorId, 1);
  };

  const showImage = product.image && !imgFailed;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gold-primary/40 bg-bg-card shadow-card-dark transition duration-200 hover:-translate-y-0.5 hover:border-gold-primary hover:shadow-gold-soft">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square bg-gradient-to-br from-red-dark/15 to-bg-card-elevated flex items-center justify-center overflow-hidden">
          {showImage ? (
            <img
              src={proxyImage(product.image)}
              alt=""
              className="h-full w-full object-contain p-2"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="text-5xl md:text-6xl">📦</span>
          )}
          {product.discount > 0 && (
            <span className="absolute left-2 top-2 rounded bg-red-primary px-1.5 py-0.5 text-[10px] font-bold text-white shadow-red-glow">
              -{product.discount}%
            </span>
          )}
        </div>
      </Link>

      <button
        aria-label="Remove from wishlist"
        onClick={(e) => {
          e.preventDefault();
          wishlist.remove(product.id);
        }}
        className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-red-primary text-white shadow-red-glow transition hover:bg-red-bright"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      <div className="p-2.5 md:p-3">
        <h3 className="text-[12px] font-semibold leading-tight text-text-primary line-clamp-2 min-h-[32px] md:text-[13px]">
          {product.title}
        </h3>
        {product.subtitle && (
          <p className="mt-0.5 text-[10px] text-text-muted line-clamp-1 md:text-[11px]">
            {product.subtitle}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[10px] md:text-[11px]">
          <span className="text-gold-primary">★</span>
          <span className="text-text-secondary">{product.rating.toFixed(1)}</span>
          <span className="text-text-muted">({product.reviews})</span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-red-primary md:text-base">
            {formatBDT(product.price)}
          </span>
          {product.oldPrice > product.price && (
            <span className="text-[10px] text-text-muted line-through md:text-[11px]">
              {formatBDT(product.oldPrice)}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          className="mt-2 w-full rounded-lg bg-red-primary py-2 text-[11px] font-semibold text-white shadow-red-glow transition hover:bg-red-bright md:text-[12px]"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}