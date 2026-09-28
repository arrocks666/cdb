"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBDT } from "@/lib/data";
import { useProducts } from "@/lib/ProductsContext";
import { useCart } from "@/lib/CartContext";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  const { products } = useProducts();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const cartRows = useMemo(() => {
    return cart.items
      .map((item) => {
        // If it's a live item, use the snapshot
        if (item.isLive && item.liveSnapshot) {
          return {
            key: `${item.productId}-${item.colorId}`,
            productId: item.productId,
            title: item.liveSnapshot.title,
            image: item.liveSnapshot.image,
            price: item.liveSnapshot.price,
            colorId: item.colorId,
            quantity: item.quantity,
            lineTotal: item.liveSnapshot.price * item.quantity,
            href: `/live-product/${item.productId}`,
            isLive: true,
          };
        }
        // Otherwise look up product from Firestore-backed list
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return {
          key: `${item.productId}-${item.colorId}`,
          productId: product.id,
          title: product.title,
          image: product.image,
          price: product.price,
          colorId: item.colorId,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
          href: `/product/${product.id}`,
          isLive: false,
        };
      })
      .filter(Boolean) as Array<{
      key: string;
      productId: string;
      title: string;
      image: string;
      price: number;
      colorId: string;
      quantity: number;
      lineTotal: number;
      href: string;
      isLive: boolean;
    }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.items, products]);

  const isSelected = (key: string) => selected[key] !== false;
  const toggleSelected = (key: string) =>
    setSelected((prev) => ({ ...prev, [key]: !isSelected(key) }));
  const allSelected = cartRows.every((r) => isSelected(r.key));
  const toggleAll = () => {
    const next = !allSelected;
    const map: Record<string, boolean> = {};
    cartRows.forEach((r) => (map[r.key] = next));
    setSelected(map);
  };

  const selectedRows = cartRows.filter((r) => isSelected(r.key));
  const subtotal = selectedRows.reduce((sum, r) => sum + r.lineTotal, 0);
  const shipping = selectedRows.length > 0 ? 200 : 0;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    const keys = selectedRows.map((r) => r.key).join(",");
    router.push(`/checkout?items=${encodeURIComponent(keys)}`);
  };

  if (cartRows.length === 0) {
    return (
      <div className="min-h-screen bg-bg-secondary pb-32">
        <TopBar count={0} />
        <div className="mt-20 flex flex-col items-center text-center px-4">
          <div className="text-6xl opacity-40">🛒</div>
          <h3 className="mt-4 text-lg font-bold text-text-primary">Your cart is empty</h3>
          <p className="mt-1 max-w-xs text-xs text-text-muted">Add products to your cart to see them here.</p>
          <button onClick={() => router.push("/")} className="mt-5 rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury">
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary pb-44">
      <TopBar count={cartRows.length} onClear={() => cart.clear()} />

      <div className="sticky top-[56px] z-30 border-b border-border-subtle bg-white px-4 py-2.5 shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-2">
          <button
            onClick={toggleAll}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${allSelected ? "border-gold-primary bg-gold-primary" : "border-border-subtle bg-white"}`}
          >
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <span className="text-xs font-medium text-text-primary">Select All</span>
          <span className="ml-auto text-[11px] text-text-muted">{selectedRows.length} of {cartRows.length} selected</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-3 md:px-4 md:py-4">
        <div className="space-y-2.5">
          {cartRows.map((row) => (
            <div key={row.key} className="rounded-lg border border-border-subtle bg-white p-3 shadow-card-dark">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleSelected(row.key)}
                  className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${isSelected(row.key) ? "border-gold-primary bg-gold-primary" : "border-border-subtle bg-white"}`}
                >
                  {isSelected(row.key) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                <Link href={row.href} className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-white">
                  <CartImage src={row.image} />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={row.href}>
                    <h3 className="text-[12px] font-medium leading-tight text-text-primary line-clamp-2 md:text-sm">{row.title}</h3>
                  </Link>
                  <div className="mt-1.5 text-sm font-bold text-red-primary md:text-base">{formatBDT(row.price)}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
                <div className="inline-flex items-center rounded border border-border-subtle bg-white">
                  <button onClick={() => cart.updateQty(row.productId, row.colorId, row.quantity - 1)} className="flex h-8 w-8 items-center justify-center text-text-secondary transition hover:text-gold-primary">−</button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-text-primary">{row.quantity}</span>
                  <button onClick={() => cart.updateQty(row.productId, row.colorId, row.quantity + 1)} className="flex h-8 w-8 items-center justify-center text-text-secondary transition hover:text-gold-primary">+</button>
                </div>

                <button aria-label="Remove" onClick={() => cart.remove(row.productId, row.colorId)} className="flex h-8 w-8 items-center justify-center text-text-secondary transition hover:text-red-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-[60px] left-0 right-0 z-40 border-t border-border-subtle bg-white shadow-nav md:bottom-0">
        <div className="mx-auto max-w-[1800px] px-4 py-3">
          <div className="space-y-1 text-xs md:text-sm">
            <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span className="text-text-primary">{formatBDT(subtotal)}</span></div>
            <div className="flex justify-between text-text-secondary"><span>Shipping</span><span className="text-text-primary">{formatBDT(shipping)}</span></div>
            <div className="mt-2 flex justify-between border-t border-border-subtle pt-2">
              <span className="text-sm font-semibold text-text-primary md:text-base">Total</span>
              <span className="text-lg font-bold text-red-primary md:text-xl">{formatBDT(total)}</span>
            </div>
          </div>
          <button onClick={handleCheckout} disabled={selectedRows.length === 0} className="mt-3 w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:cursor-not-allowed disabled:opacity-40">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function CartImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="text-3xl">📦</span>;
  return <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1" onError={() => setFailed(true)} />;
}

function TopBar({ count, onClear }: { count: number; onClear?: () => void }) {
  return (
    <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
        <Link href="/" aria-label="Back" className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-none text-text-primary md:text-xl">My Cart</h1>
          <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">{count} {count === 1 ? "Item" : "Items"}</p>
        </div>
        {count > 0 && onClear && (
          <button aria-label="Clear cart" onClick={onClear} className="flex h-8 w-8 items-center justify-center text-text-secondary transition hover:text-red-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}