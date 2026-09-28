"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBDT } from "@/lib/data";
import { useWishlist } from "@/lib/WishlistContext";
import { useCart } from "@/lib/CartContext";
import { useWhatsApp } from "@/lib/WhatsAppContext";
import { useLiveProducts } from "@/lib/LiveProductContext";
import { LiveProduct } from "@/lib/live-search";

export default function LiveProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const wishlist = useWishlist();
  const cart = useCart();
  const whatsapp = useWhatsApp();
  const liveStore = useLiveProducts();

  const [product, setProduct] = useState<LiveProduct | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const found = liveStore.get(id);
    if (found) setProduct(found);
    else setNotFound(true);
  }, [id, liveStore]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Product not found</h1>
          <p className="mt-2 text-sm text-text-muted">This product was from a live search. Please search again.</p>
          <Link href="/search" className="mt-6 inline-block rounded-full bg-gold-primary px-6 py-2.5 text-sm font-semibold text-white shadow-orange-glow">Back to Search</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
      </div>
    );
  }

  // Safe fallbacks for potentially missing fields
  const features = Array.isArray(product.features) ? product.features : [];
  const gallery = Array.isArray(product.gallery) && product.gallery.length > 0
    ? product.gallery
    : [product.image];

  const inWishlist = wishlist.has(product.id);
  const showImage = product.image && !imgFailed;

  const handleAddToCart = () => {
    cart.addLive(
      {
        id: product.id,
        title: product.title,
        subtitle: product.subtitle,
        price: product.price,
        oldPrice: product.oldPrice,
        discount: product.discount,
        image: product.image,
        rating: product.rating,
        reviews: product.reviews,
        description: product.description,
        sourceUrl: product.sourceUrl,
        moq: product.moq,
        supplierName: product.supplierName,
        priceOriginalCny: product.priceOriginalCny,
      },
      "default",
      quantity
    );
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => router.push("/cart"), 400);
  };

  const handleToggleWishlist = () => {
    wishlist.toggleLive({
      id: product.id,
      title: product.title,
      subtitle: product.subtitle,
      price: product.price,
      oldPrice: product.oldPrice,
      discount: product.discount,
      image: product.image,
      rating: product.rating,
      reviews: product.reviews,
      description: product.description,
      sourceUrl: product.sourceUrl,
      moq: product.moq,
      supplierName: product.supplierName,
      priceOriginalCny: product.priceOriginalCny,
      isLive: true,
    });
  };

  const handleWhatsApp = () => {
    const productUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/live-product/${product.id}`
        : "";
    whatsapp.openWhatsApp(product.title, productUrl);
  };

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 flex items-center justify-between border-b border-border-subtle bg-white px-4 py-3 shadow-sm md:top-[60px]">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center text-text-primary transition hover:text-gold-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          aria-label={inWishlist ? "Remove" : "Add"}
          onClick={handleToggleWishlist}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            inWishlist ? "bg-red-primary text-white" : "text-text-muted hover:text-red-primary"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm">
              <div className="flex h-full items-center justify-center p-4">
                {showImage ? (
                  <img src={product.image} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onError={() => setImgFailed(true)} />
                ) : (
                  <span className="text-[160px] md:text-[220px]">📦</span>
                )}
              </div>
              {product.discount > 0 && (
                <div className="absolute left-3 top-3 rounded bg-red-primary px-2 py-1 text-xs font-bold text-white">-{product.discount}%</div>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold leading-tight text-text-primary md:text-3xl">{product.title}</h1>
            {product.subtitle && (
              <p className="mt-1 text-base font-medium text-text-secondary md:text-lg">{product.subtitle}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gold-primary">★★★★★</span>
                <span className="text-text-primary font-medium">{(product.rating ?? 4.5).toFixed(1)}</span>
              </div>
              <span className="text-text-muted">({product.reviews ?? 0} reviews)</span>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold text-red-primary md:text-4xl">{formatBDT(product.price)}</span>
              {product.oldPrice > product.price && (
                <span className="text-sm text-text-muted line-through md:text-base">{formatBDT(product.oldPrice)}</span>
              )}
              {product.discount > 0 && (
                <span className="rounded bg-red-primary/10 px-2 py-0.5 text-[11px] font-bold text-red-primary md:text-xs">{product.discount}% OFF</span>
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

            {features.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {features.map((chip, i) => (
                  <div key={`${chip.label || i}`} className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-input px-3 py-1.5 text-[11px] font-medium text-text-secondary md:text-xs">
                    <span>{chip.icon}</span>{chip.label}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <div className="mb-2 text-xs text-text-secondary md:text-sm">Quantity</div>
              <div className="inline-flex items-center rounded border border-border-subtle bg-white">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center text-text-secondary transition hover:text-gold-primary">−</button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums text-text-primary">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} className="flex h-9 w-9 items-center justify-center text-text-secondary transition hover:text-gold-primary">+</button>
              </div>
            </div>

            {addedFeedback && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-xs font-semibold text-success md:text-sm">✓ Added to cart</div>
            )}

            <div className="mt-6 hidden gap-3 md:flex">
              <button onClick={handleAddToCart} className="flex-1 rounded-lg border-2 border-gold-primary bg-white py-3 text-sm font-semibold text-gold-primary transition hover:bg-gold-primary hover:text-white">Add to Cart</button>
              <button onClick={handleBuyNow} className="flex-1 rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury">Buy Now</button>
            </div>

            <button onClick={handleWhatsApp} className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#20BD5A] md:flex">
              Contact on WhatsApp
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-sm md:col-span-2 md:p-5">
            <h3 className="text-base font-bold text-text-primary md:text-lg">Product Details</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary md:text-sm">{product.description}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary md:text-base">🚚 Shipping Information</h3>
            <ul className="space-y-2 text-xs text-text-secondary md:text-sm">
              <li className="flex justify-between gap-3"><span>Delivery Time</span><span className="font-semibold text-text-primary">7–15 days</span></li>
              <li className="flex justify-between gap-3"><span>Shipping Cost</span><span className="font-semibold text-text-primary">From ৳60</span></li>
              <li className="flex justify-between gap-3"><span>Free Shipping</span><span className="font-semibold text-success">Over ৳2,000</span></li>
            </ul>
          </div>
          <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary md:text-base">↩️ Return Policy</h3>
            <ul className="space-y-2 text-xs text-text-secondary md:text-sm">
              <li className="flex justify-between gap-3"><span>Return Window</span><span className="font-semibold text-text-primary">7 days</span></li>
              <li className="flex justify-between gap-3"><span>Defective Items</span><span className="font-semibold text-success">Free Return</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[60px] left-0 right-0 z-40 flex gap-2 border-t border-border-subtle bg-white px-3 py-2.5 shadow-nav md:hidden">
        <button onClick={handleAddToCart} className="flex-1 rounded-lg border-2 border-gold-primary bg-white py-2.5 text-xs font-semibold text-gold-primary">Add to Cart</button>
        <button onClick={handleBuyNow} className="flex-1 rounded-lg bg-gold-primary py-2.5 text-xs font-semibold text-white shadow-orange-glow">Buy Now</button>
        <button onClick={handleWhatsApp} aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366] text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      </div>
    </div>
  );
}