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
import { hasChinese, translateLocation } from "@/lib/chinaLocations";
import {
  loadSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/firestoreSettings";

function findLocation(
  features?: { icon: string; label: string }[]
): string | null {
  if (!features) return null;
  for (const f of features) {
    if (!f.label) continue;
    if (hasChinese(f.label)) {
      const t = translateLocation(f.label);
      if (t) return `${t}, China`;
    }
  }
  return null;
}

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
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [shippingMethod, setShippingMethod] = useState<"air" | "sea">("air");
  const [showWeightDetails, setShowWeightDetails] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const found = liveStore.get(id);
    if (found) setProduct(found);
    else setNotFound(true);
  }, [id, liveStore]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            Product not found
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            This product was from a live search. Please search again.
          </p>
          <Link
            href="/search"
            className="mt-6 inline-block rounded-full bg-gold-primary px-6 py-2.5 text-sm font-semibold text-white shadow-orange-glow"
          >
            Back to Search
          </Link>
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

  const features = Array.isArray(product.features) ? product.features : [];
  const inWishlist = wishlist.has(product.id);
  const showImage = product.image && !imgFailed;
  const location = findLocation(features);

  const subtitle =
    product.subtitle && !hasChinese(product.subtitle) ? product.subtitle : null;

  // Weight & shipping calculation
  const weightKg = settings.defaultWeightKg || 0.5;
  const weightNum = quantity * weightKg;

  const shippingCost =
    shippingMethod === "air"
      ? Math.round(weightNum * settings.byAirRate1)
      : Math.round(weightNum * settings.bySeaRate);

  // Payment split
  const payNowAmount = Math.round(
    (product.price * quantity * settings.payNowPercent) / 100
  );
  const payOnDeliveryAmount = product.price * quantity - payNowAmount;

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
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center text-text-primary transition hover:text-gold-primary"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          aria-label={inWishlist ? "Remove" : "Add"}
          onClick={handleToggleWishlist}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            inWishlist
              ? "bg-red-primary text-white"
              : "text-text-muted hover:text-red-primary"
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

      <div className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm">
              <div className="flex h-full items-center justify-center p-4">
                {showImage ? (
                  <img
                    src={product.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <span className="text-[160px] md:text-[220px]">📦</span>
                )}
              </div>
              {product.discount > 0 && (
                <div className="absolute left-3 top-3 rounded bg-red-primary px-2 py-1 text-xs font-bold text-white">
                  -{product.discount}%
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold leading-tight text-text-primary md:text-3xl">
              {product.title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-base font-medium text-text-secondary md:text-lg">
                {subtitle}
              </p>
            )}

            {location && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gold-primary/40 bg-bg-orange px-4 py-2.5 text-sm font-semibold text-gold-primary md:text-base">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {location}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gold-primary">★★★★★</span>
                <span className="text-text-primary font-medium">
                  {(product.rating ?? 4.5).toFixed(1)}
                </span>
              </div>
              <span className="text-text-muted">
                ({product.reviews ?? 0} reviews)
              </span>
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
                <span className="rounded bg-red-primary/10 px-2 py-0.5 text-[11px] font-bold text-red-primary md:text-xs">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            <div className="mt-3">
              <div className="inline-flex items-center gap-1.5 text-xs md:text-sm">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="font-semibold text-success">In Stock</span>
              </div>
            </div>

            {/* SHIPPING METHOD SELECTOR */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold text-text-primary md:text-sm">
                Shipping Method
              </p>
              <div className="grid grid-cols-2 gap-2">
                {settings.showByAirOnProductPage && (
                  <button
                    onClick={() => setShippingMethod("air")}
                    className={`rounded-lg border-2 p-3 text-left transition ${
                      shippingMethod === "air"
                        ? "border-gold-primary bg-bg-orange"
                        : "border-border-subtle bg-white hover:border-gold-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✈️</span>
                      <span className="text-sm font-bold text-text-primary">
                        By Air
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">
                      ৳{settings.byAirRate1} / ৳{settings.byAirRate2} Per Kg
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-text-primary">
                      {settings.byAirDays} Days
                    </p>
                  </button>
                )}

                {settings.showBySeaOnProductPage && (
                  <button
                    onClick={() => setShippingMethod("sea")}
                    className={`rounded-lg border-2 p-3 text-left transition ${
                      shippingMethod === "sea"
                        ? "border-gold-primary bg-bg-orange"
                        : "border-border-subtle bg-white hover:border-gold-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚢</span>
                      <span className="text-sm font-bold text-text-primary">
                        By Sea
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">
                      ৳{settings.bySeaRate} / Kg থেকে শুরু
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-text-primary">
                      {settings.bySeaDays} Days
                    </p>
                  </button>
                )}
              </div>
            </div>

            {/* QUANTITY */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary md:text-sm">
                Quantity
              </span>
              <div className="inline-flex items-center rounded border border-border-subtle bg-white">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center text-text-secondary transition hover:text-gold-primary"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums text-text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center text-text-secondary transition hover:text-gold-primary"
                >
                  +
                </button>
              </div>
            </div>

            {/* PRICE BREAKDOWN */}
            <div className="mt-4 space-y-2 border-t border-border-subtle pt-4 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Product price</span>
                <span className="font-medium text-text-primary">
                  {formatBDT(product.price * quantity)}
                </span>
              </div>

              <div className="flex justify-between text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="rounded bg-bg-input px-1.5 py-0.5 text-[10px] font-bold">
                    {settings.payNowPercent}%
                  </span>
                  Pay now
                </span>
                <span className="font-medium text-text-primary">
                  {formatBDT(payNowAmount)}
                </span>
              </div>

              <div className="flex justify-between text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="rounded bg-bg-input px-1.5 py-0.5 text-[10px] font-bold">
                    {100 - settings.payNowPercent}%
                  </span>
                  Pay on delivery
                </span>
                <span className="font-medium text-text-primary">
                  {formatBDT(payOnDeliveryAmount)} +
                  <span className="text-[11px] text-text-muted">
                    {" "}
                    Shipping + China Courier Charge
                  </span>
                </span>
              </div>
            </div>

            {/* WEIGHT BOX */}
            <div className="mt-4 rounded-lg border-2 border-dashed border-red-primary/40 bg-red-primary/5 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-primary md:text-sm">
                  <span className="text-base">⚖️</span>
                  Approximate weight: {weightNum.toFixed(1)}kg
                </div>
                <button
                  onClick={() => setShowWeightDetails(!showWeightDetails)}
                  className="text-[11px] font-medium text-gold-primary underline md:text-xs"
                >
                  বিস্তারিত
                </button>
              </div>

              {showWeightDetails && (
                <div className="mt-2 border-t border-red-primary/20 pt-2">
                  <p className="text-sm font-bold text-text-primary">
                    শিপিং চার্জ
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    ৳
                    {shippingMethod === "air"
                      ? settings.byAirRate1
                      : settings.bySeaRate}{" "}
                    /{" "}
                    {shippingMethod === "air" ? settings.byAirRate2 : "kg"} Per
                    Kg
                  </p>
                </div>
              )}
            </div>

            {/* WARNING TEXT */}
            {settings.shippingWarning && (
              <p className="mt-3 text-[11px] leading-relaxed text-red-primary md:text-xs">
                {settings.shippingWarning}
              </p>
            )}

            {addedFeedback && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Added to cart!
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={handleAddToCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold-primary bg-white py-3 text-sm font-semibold text-gold-primary transition hover:bg-bg-orange"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="flex flex-1 items-center justify-center rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
              >
                Buy Now
              </button>
            </div>

            <button
              onClick={handleWhatsApp}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-success bg-white py-3 text-sm font-semibold text-success transition hover:bg-success/5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.993 11.993 0 0 0 5.71 1.448h.005c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411zm-8.475 18.29h-.004a9.955 9.955 0 0 1-5.076-1.39l-.364-.216-3.76.98 1.005-3.663-.238-.376a9.945 9.945 0 0 1-1.52-5.307c.002-5.518 4.494-9.996 10.02-9.996 2.675 0 5.187 1.043 7.078 2.935a9.923 9.923 0 0 1 2.933 7.075c-.003 5.52-4.495 9.998-10.074 9.998z" />
              </svg>
              Order via WhatsApp
            </button>

            {product.description && !hasChinese(product.description) && (
              <div className="mt-6 rounded-lg border border-border-subtle bg-white p-4">
                <h2 className="mb-2 text-sm font-bold text-text-primary md:text-base">
                  Description
                </h2>
                <p className="text-xs leading-relaxed text-text-secondary md:text-sm">
                  {product.description}
                </p>
              </div>
            )}

            {settings.howToOrder && (
              <div className="mt-3 rounded-lg border border-border-subtle bg-white p-4">
                <h2 className="mb-2 text-sm font-bold text-text-primary md:text-base">
                  How to Order
                </h2>
                <p className="whitespace-pre-line text-xs leading-relaxed text-text-secondary md:text-sm">
                  {settings.howToOrder}
                </p>
              </div>
            )}

            {settings.deliveryInfo && (
              <div className="mt-3 rounded-lg border border-border-subtle bg-white p-4">
                <h2 className="mb-2 text-sm font-bold text-text-primary md:text-base">
                  Delivery Info
                </h2>
                <p className="whitespace-pre-line text-xs leading-relaxed text-text-secondary md:text-sm">
                  {settings.deliveryInfo}
                </p>
              </div>
            )}

            {settings.returnPolicy && (
              <div className="mt-3 rounded-lg border border-border-subtle bg-white p-4">
                <h2 className="mb-2 text-sm font-bold text-text-primary md:text-base">
                  Return Policy
                </h2>
                <p className="whitespace-pre-line text-xs leading-relaxed text-text-secondary md:text-sm">
                  {settings.returnPolicy}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}