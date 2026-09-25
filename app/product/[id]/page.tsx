"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { products, formatBDT } from "@/lib/data";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";

function proxyImage(url: string | undefined | null): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const product = products.find((p) => p.id === id);

  const wishlist = useWishlist();
  const cart = useCart();
  const inWishlist = product ? wishlist.has(product.id) : false;

  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [mainImgFailed, setMainImgFailed] = useState(false);

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-bold">
          <span className="gold-text">Product not found</span>
        </h1>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-red-primary px-6 py-2.5 text-sm font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const selectedColorId = product.colors[selectedColor]?.id ?? "default";
  const gallery = product.gallery.length > 0 ? product.gallery : [product.image];

  const handleAddToCart = () => {
    cart.add(product.id, selectedColorId, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const handleBuyNow = () => {
    cart.add(product.id, selectedColorId, quantity);
    router.push("/cart");
  };

  const showMainImage = gallery[activeImage] && !mainImgFailed;

  return (
    <div>
      <div className="sticky top-[100px] z-40 flex items-center justify-between border-b border-border-subtle bg-bg-base/95 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center text-text-primary transition hover:text-gold-primary"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <button
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() => wishlist.toggle(product.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              inWishlist
                ? "bg-red-primary text-white shadow-red-glow"
                : "text-gold-primary hover:text-red-primary"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={inWishlist ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-gold-primary/40 bg-gradient-to-br from-red-dark/15 to-bg-card-elevated shadow-card-dark">
              <div className="flex h-full items-center justify-center p-4">
                {showMainImage ? (
                  <img
                    src={proxyImage(gallery[activeImage])}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    onError={() => setMainImgFailed(true)}
                  />
                ) : (
                  <span className="text-[160px] md:text-[220px]">📦</span>
                )}
              </div>
              {product.discount > 0 && (
                <div className="absolute left-3 top-3 rounded bg-red-primary px-2 py-1 text-xs font-bold text-white shadow-red-glow">
                  -{product.discount}%
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveImage(i);
                    setMainImgFailed(false);
                  }}
                  className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-2 bg-bg-card-elevated p-1 transition ${
                    activeImage === i
                      ? "border-gold-primary shadow-gold-soft"
                      : "border-border-subtle hover:border-gold-primary/60"
                  }`}
                >
                  {img ? (
                    <img
                      src={proxyImage(img)}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-xl">📦</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 className="font-serif text-xl font-bold leading-tight text-text-primary md:text-3xl">
              {product.title}
            </h1>
            {product.supplierName && (
              <p className="mt-1 text-sm text-text-muted md:text-base">
                by {product.supplierName}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-gold-primary">
                <span>★★★★★</span>
                <span className="text-text-primary">{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-text-muted">({product.reviews} reviews)</span>
              {product.rating >= 4.7 && (
                <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                  Top Rated
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold text-red-primary md:text-4xl">
                {formatBDT(product.price)}
              </span>
              {product.oldPrice > product.price && (
                <span className="text-sm text-text-muted line-through md:text-base">
                  {formatBDT(product.oldPrice)}
                </span>
              )}
              {product.discount > 0 && (
                <span className="rounded-full bg-red-primary/20 px-2 py-0.5 text-[11px] font-bold text-red-primary md:text-xs">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            <div className="mt-3">
              <div className="inline-flex items-center gap-1.5 text-xs md:text-sm">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="font-semibold text-success">In Stock</span>
                {product.moq && product.moq > 1 && (
                  <span className="text-text-muted">— Min order: {product.moq} pcs</span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {product.features.map((chip) => (
                <div
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-primary/40 bg-bg-card px-3 py-1.5 text-[11px] font-medium text-gold-primary md:text-xs"
                >
                  <span>{chip.icon}</span>
                  {chip.label}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-2 text-xs text-text-secondary md:text-sm">Quantity</div>
              <div className="inline-flex items-center rounded-full border border-gold-primary/50 bg-bg-card">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center text-gold-primary transition hover:text-red-primary"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums text-text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center text-gold-primary transition hover:text-red-primary"
                >
                  +
                </button>
              </div>
            </div>

            {addedFeedback && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/20 px-4 py-2 text-xs font-semibold text-success md:text-sm">
                ✓ Added to cart
              </div>
            )}

            <div className="mt-6 hidden gap-3 md:flex">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 rounded-lg border-2 border-red-primary bg-transparent py-3 text-sm font-semibold text-red-primary transition hover:bg-red-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!product.inStock}
                className="flex-1 rounded-lg bg-red-primary py-3 text-sm font-semibold text-white shadow-red-glow transition hover:bg-red-bright disabled:cursor-not-allowed disabled:opacity-40"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:col-span-2 md:p-5">
            <h3 className="font-serif text-base font-bold md:text-lg">
              <span className="gold-text">Product Details</span>
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary md:text-sm">
              {product.description}
            </p>
            {product.sourceUrl && (
              <p className="mt-2 text-[11px] text-text-muted md:text-xs">
                Source:{" "}
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-primary underline hover:text-gold-luxury"
                >
                  Alibaba
                </a>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark">
            <h3 className="mb-3 flex items-center gap-2 font-serif text-sm font-bold text-gold-primary md:text-base">
              <span>🚚</span>
              Shipping Information
            </h3>
            <ul className="space-y-2 text-xs text-text-secondary md:text-sm">
              <li className="flex justify-between gap-3">
                <span>Delivery Time</span>
                <span className="font-semibold text-text-primary">7–15 days</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Shipping Cost</span>
                <span className="font-semibold text-text-primary">From ৳60</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Free Shipping</span>
                <span className="font-semibold text-success">Over ৳2,000</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Ships From</span>
                <span className="font-semibold text-text-primary">China 🇨🇳</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark">
            <h3 className="mb-3 flex items-center gap-2 font-serif text-sm font-bold text-gold-primary md:text-base">
              <span>↩️</span>
              Return Policy
            </h3>
            <ul className="space-y-2 text-xs text-text-secondary md:text-sm">
              <li className="flex justify-between gap-3">
                <span>Return Window</span>
                <span className="font-semibold text-text-primary">7 days</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Defective Items</span>
                <span className="font-semibold text-success">Free Return</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Refund Method</span>
                <span className="font-semibold text-text-primary">bKash / Nagad</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[60px] left-0 right-0 z-40 flex gap-2 border-t border-border-subtle bg-bg-nav/95 px-3 py-2.5 backdrop-blur-md md:hidden">
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className="flex-1 rounded-lg border-2 border-red-primary bg-transparent py-2.5 text-xs font-semibold text-red-primary transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!product.inStock}
          className="flex-1 rounded-lg bg-red-primary py-2.5 text-xs font-semibold text-white shadow-red-glow transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}