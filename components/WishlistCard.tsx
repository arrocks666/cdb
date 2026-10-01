"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/ProductsContext";
import { formatBDT } from "@/lib/data";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";

function hasChinese(text: string | undefined): boolean {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

export default function WishlistCard({ product }: { product: Product }) {
  const wishlist = useWishlist();
  const cart = useCart();
  const [imgFailed, setImgFailed] = useState(false);

  const handleAddToCart = () => {
    const defaultColorId = product.colors?.[0]?.id ?? "default";
    // ✅ FIXED: cast product.id to string and pass undefined for size
    cart.add(String(product.id), defaultColorId, undefined, 1);
  };

  const showImage = product.image && !imgFailed;

  const subtitle =
    product.subtitle && !hasChinese(product.subtitle) ? product.subtitle : null;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm transition duration-200 hover:shadow-md">
      <Link href={`/product/${product.id}`} className="block">
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
            <span className="text-5xl md:text-6xl">📦</span>
          )}
          {product.discount > 0 && (
            <span className="absolute left-2 top-2 rounded bg-red-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
              -{product.discount}%
            </span>
          )}
        </div>
      </Link>

      <button
        aria-label="Remove from wishlist"
        onClick={(e) => {
          e.preventDefault();
          // ✅ FIXED: cast product.id to string
          wishlist.remove(String(product.id));
        }}
        className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-red-primary text-white transition hover:bg-red-bright"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

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
        <button
          onClick={handleAddToCart}
          className="mt-2 w-full rounded-lg bg-gold-primary py-2 text-[11px] font-semibold text-white transition hover:bg-gold-luxury md:text-[12px]"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}