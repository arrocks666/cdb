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
import ShippingDetailsModal from "@/components/ShippingDetailsModal";

const COLORS_SHOWN_INLINE = 6;

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
  const [showShippingDetails, setShowShippingDetails] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeImage, setActiveImage] = useState(0);
  const [showColorModal, setShowColorModal] = useState(false);
  const [colorSearch, setColorSearch] = useState("");

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const found = liveStore.get(id);
    if (found) setProduct(found);
    else setNotFound(true);
  }, [id, liveStore]);

  // ⭐ Only set defaults once
  useEffect(() => {
    if (!product) return;
    setSelectedColorId((prev) => prev || product.colors?.[0]?.id || "");
    setSelectedSize((prev) => prev || product.sizes?.[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

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
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null;
  const firstSixColors = colors.slice(0, COLORS_SHOWN_INLINE);

  const filteredColors = colorSearch.trim()
    ? colors.filter((c) =>
        c.label.toLowerCase().includes(colorSearch.trim().toLowerCase())
      )
    : colors;

  const gallery = product.gallery?.length ? product.gallery : [product.image];
  const currentImage = gallery[activeImage] ?? product.image;
  const showImage = currentImage && !imgFailed;
  const location = findLocation(features);

  const subtitle =
    product.subtitle && !hasChinese(product.subtitle) ? product.subtitle : null;

  const weightKg = product.weightKg ?? settings.defaultWeightKg ?? 0.5;
  const weightNum = quantity * weightKg;

  const payNowAmount = Math.round(
    (product.price * quantity * settings.payNowPercent) / 100
  );
  const payOnDeliveryAmount = product.price * quantity - payNowAmount;

  const priceLabel =
    product.priceMax && product.priceMax > product.price
      ? `${formatBDT(product.price)} – ${formatBDT(product.priceMax)}`
      : formatBDT(product.price);

  const handleAddToCart = () => {
    cart.addLive(
      {
        id: product.id,
        title: product.title,
        subtitle: product.subtitle,
        price: product.price,
        priceMax: product.priceMax,
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
        colors: product.colors,
        sizes: product.sizes,
      },
      selectedColorId || "default",
      selectedSize || undefined,
      quantity,
      selectedColor?.label
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
          {/* IMAGES */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm">
              <div className="flex h-full items-center justify-center p-4">
                {showImage ? (
                  <img
                    src={currentImage}
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
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveImage(i);
                      setImgFailed(false);
                    }}
                    className={`flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-white p-1 transition ${
                      activeImage === i
                        ? "border-gold-primary"
                        : "border-border-subtle hover:border-gold-primary"
                    }`}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        referrerPolicy="no-referrer"
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
            )}
          </div>

          {/* DETAILS */}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                {priceLabel}
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

            {/* COLOR SELECTOR */}
            {colors.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold text-text-primary md:text-sm">
                  Color{" "}
                  {selectedColor && (
                    <span className="font-normal text-text-muted">
                      — {selectedColor.label}
                    </span>
                  )}
                </p>

                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                  {firstSixColors.map((c) => {
                    const active = c.id === selectedColorId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColorId(c.id)}
                        title={c.label}
                        className={`group flex flex-col overflow-hidden rounded-lg border-2 bg-white text-left transition ${
                          active
                            ? "border-gold-primary shadow-orange-glow"
                            : "border-border-subtle hover:border-gold-primary/60"
                        }`}
                      >
                        <div className="aspect-square w-full overflow-hidden bg-bg-input">
                          {c.image ? (
                            <img
                              src={c.image}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span
                                className="h-10 w-10 rounded-full border border-black/10"
                                style={{ backgroundColor: c.hex }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="px-1.5 py-1.5 text-center">
                          <p className="line-clamp-2 text-[10px] font-medium leading-tight text-text-primary md:text-[11px]">
                            {c.label}
                          </p>
                          {active && (
                            <p className="mt-0.5 text-[9px] font-bold text-gold-primary md:text-[10px]">
                              ✓ Selected
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {colors.length > COLORS_SHOWN_INLINE && (
                  <button
                    type="button"
                    onClick={() => setShowColorModal(true)}
                    className="mt-3 w-full rounded-lg border-2 border-dashed border-gold-primary/40 bg-bg-orange py-2.5 text-xs font-semibold text-gold-primary transition hover:bg-gold-primary/10 md:text-sm"
                  >
                    Show all {colors.length} colors →
                  </button>
                )}
              </div>
            )}

            {/* SIZE SELECTOR */}
            {sizes.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold text-text-primary md:text-sm">
                  Size{" "}
                  {selectedSize && (
                    <span className="font-normal text-text-muted">
                      — {selectedSize}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const active = s === selectedSize;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`min-w-[42px] rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-gold-primary bg-bg-orange text-gold-primary"
                            : "border-border-subtle bg-white text-text-primary hover:border-gold-primary/60"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SHIPPING */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold text-text-primary md:text-sm">
                Shipping Method
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
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
                <button
                  type="button"
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
              </div>
            </div>

            {/* QUANTITY */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary md:text-sm">
                Quantity
              </span>
              <div className="inline-flex items-center rounded border border-border-subtle bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center text-text-secondary transition hover:text-gold-primary"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums text-text-primary">
                  {quantity}
                </span>
                <button
                  type="button"
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
                  type="button"
                  onClick={() => setShowShippingDetails(true)}
                  className="text-[11px] font-medium text-gold-primary underline md:text-xs"
                >
                  বিস্তারিত
                </button>
              </div>
            </div>

            {settings.shippingWarning && (
              <p className="mt-3 text-[11px] leading-relaxed text-red-primary md:text-xs">
                {settings.shippingWarning}
              </p>
            )}

            {addedFeedback && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Added to cart!
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold-primary bg-white py-3 text-sm font-semibold text-gold-primary transition hover:bg-bg-orange"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="flex flex-1 items-center justify-center rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
              >
                Buy Now
              </button>
            </div>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-success bg-white py-3 text-sm font-semibold text-success transition hover:bg-success/5"
            >
              Order via WhatsApp
            </button>

            {/* SPECS */}
            {product.specs && product.specs.length > 0 && (
              <div className="mt-6 rounded-lg border border-border-subtle bg-white p-4">
                <h2 className="mb-3 text-sm font-bold text-text-primary md:text-base">
                  Specifications
                </h2>
                <div className="divide-y divide-border-subtle">
                  {product.specs.map((s, i) => (
                    <div
                      key={i}
                      className="flex justify-between gap-3 py-2 text-xs md:text-sm"
                    >
                      <span className="text-text-muted">{s.name}</span>
                      <span className="text-right font-medium text-text-primary">
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ⭐ INLINE COLOR MODAL — replaces the broken component */}
      {showColorModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowColorModal(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-text-primary md:text-lg">
                  Choose a Color
                </h2>
                <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
                  {colors.length} option{colors.length > 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowColorModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition hover:bg-bg-input hover:text-red-primary"
              >
                ✕
              </button>
            </div>

            {colors.length > 8 && (
              <div className="border-b border-border-subtle px-4 py-2.5">
                <input
                  type="text"
                  value={colorSearch}
                  onChange={(e) => setColorSearch(e.target.value)}
                  placeholder="Search colors..."
                  className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
                />
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {filteredColors.length === 0 ? (
                <div className="py-10 text-center text-sm text-text-muted">
                  No colors match "{colorSearch}"
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {filteredColors.map((c) => {
                    const active = c.id === selectedColorId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedColorId(c.id);
                          setShowColorModal(false);
                        }}
                        className={`flex flex-col items-center gap-1.5 overflow-hidden rounded-lg border-2 bg-white p-2 transition ${
                          active
                            ? "border-gold-primary shadow-orange-glow"
                            : "border-border-subtle hover:border-gold-primary/60"
                        }`}
                      >
                        {c.image ? (
                          <img
                            src={c.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-14 w-14 rounded object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <span
                            className="h-10 w-10 rounded-full border border-black/10"
                            style={{ backgroundColor: c.hex }}
                          />
                        )}
                        <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-text-primary md:text-xs">
                          {c.label}
                        </span>
                        {active && (
                          <span className="text-[9px] font-bold text-gold-primary">
                            ✓ Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border-subtle px-4 py-3">
              <button
                type="button"
                onClick={() => setShowColorModal(false)}
                className="w-full rounded-lg border border-border-subtle bg-white py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-bg-input md:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ShippingDetailsModal
        open={showShippingDetails}
        onClose={() => setShowShippingDetails(false)}
      />
    </div>
  );
}