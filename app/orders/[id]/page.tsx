"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrders, STATUS_ORDER, STATUS_LABELS, OrderStatus, Order } from "@/lib/OrderContext";
import { useProducts } from "@/lib/ProductsContext";
import { formatBDT } from "@/lib/data";
import { getOrder as getOrderFromFirestore } from "@/lib/firestoreOrders";

function OrderImage({
  src,
  onOpen,
}: {
  src: string;
  onOpen: (src: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="text-xl">📦</span>;
  return (
    <button
      type="button"
      onClick={() => onOpen(src)}
      className="flex h-full w-full items-center justify-center transition hover:opacity-80"
      aria-label="View full image"
    >
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className="max-h-full max-w-full object-contain"
        onError={() => setFailed(true)}
      />
    </button>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const orders = useOrders();
  const { products } = useProducts();

  const cachedOrder = orders.getOrder(id);
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);
  const [fetching, setFetching] = useState(false);

  // ✅ Full-screen image state
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (cachedOrder) return;
    let cancelled = false;
    setFetching(true);
    getOrderFromFirestore(id)
      .then((o) => {
        if (!cancelled && o) setFetchedOrder(o as Order);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, cachedOrder]);

  const order = cachedOrder ?? fetchedOrder;

  if (fetching && !order) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="text-6xl opacity-40">📦</div>
          <h1 className="mt-4 text-xl font-bold text-text-primary">Order not found</h1>
          <Link href="/orders" className="mt-5 inline-block rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow">View My Orders</Link>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const createdDate = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const charges = order.charges ?? {};

  const chargeRows = [
    {
      key: "chinaLocalCourier",
      label: "China Local Courier",
      show: charges.showChinaLocalCourier === true,
      value: charges.chinaLocalCourier ?? null,
    },
    {
      key: "shippingCharge",
      label: "Shipping Charge (China → Bangladesh)",
      show: charges.showShippingCharge === true,
      value: charges.shippingCharge ?? null,
    },
    {
      key: "bdCourier",
      label: "Bangladesh Courier Charge",
      show: charges.showBdCourier === true,
      value: charges.bdCourier ?? null,
    },
  ];

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/orders")} className="flex h-8 w-8 items-center justify-center text-text-primary hover:text-gold-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none text-text-primary md:text-xl">Track Order</h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">Order #{order.id}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
        <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-text-muted md:text-xs">Order ID</p>
              <p className="text-base font-bold text-gold-primary md:text-lg">#{order.id}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-text-muted md:text-xs">Placed on</p>
              <p className="text-sm font-medium text-text-primary md:text-base">{createdDate}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
            <span className="text-xs text-text-secondary md:text-sm">{order.items.length} {order.items.length === 1 ? "item" : "items"}</span>
            <span className="text-base font-bold text-red-primary md:text-lg">{formatBDT(order.total)}</span>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
          <h2 className="mb-4 text-base font-bold text-text-primary md:text-lg">Tracking Timeline</h2>
          <div className="relative">
            {STATUS_ORDER.map((status, i) => {
              const isDone = i < currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={status} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={`absolute left-[15px] top-8 h-full w-0.5 ${isDone ? "bg-success" : "bg-border-subtle"}`} />
                  )}
                  <div className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                    isDone ? "border-success bg-success text-white" :
                    isCurrent ? "border-gold-primary bg-gold-primary text-white shadow-orange-glow" :
                    "border-border-subtle bg-white text-text-muted"
                  }`}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : isCurrent ? (<span className="h-2.5 w-2.5 rounded-full bg-white" />) : (<span className="h-2 w-2 rounded-full bg-text-muted" />)}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-semibold md:text-base ${isDone ? "text-success" : isCurrent ? "text-gold-primary" : "text-text-muted"}`}>
                      {STATUS_LABELS[status as OrderStatus]}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
                      {isDone ? "Completed" : isCurrent ? "In progress" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
          <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item, i) => {
              const product = products.find((p) => p.id === item.productId);
              const title = item.title ?? product?.title ?? "Product";
              const image = item.image ?? product?.image ?? "";
              return (
                <div key={i} className="flex items-center gap-3 border-b border-border-subtle pb-3 last:border-b-0 last:pb-0">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-white p-1">
                    <OrderImage src={image} onOpen={setFullscreenImage} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary md:text-base">{title}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-bold text-red-primary md:text-base">{formatBDT(item.price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-3 text-xs md:text-sm">
            <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span className="text-text-primary">{formatBDT(order.subtotal)}</span></div>
            <div className="flex justify-between text-text-secondary"><span>Shipping</span><span className="text-text-primary">{formatBDT(order.shipping)}</span></div>
            <div className="mt-2 flex justify-between border-t border-border-subtle pt-2">
              <span className="font-semibold text-text-primary md:text-base">Total</span>
              <span className="text-base font-bold text-red-primary md:text-lg">{formatBDT(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border-2 border-gold-primary/40 bg-bg-orange p-4 shadow-card-dark md:p-5">
          <h2 className="mb-1 text-base font-bold text-text-primary md:text-lg">
            Additional Shipping Charges
          </h2>
          <p className="mb-4 text-[11px] text-text-muted md:text-xs">
            These charges will be confirmed once the parcel arrives in Bangladesh.
          </p>

          <div className="space-y-2">
            {chargeRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-white px-3 py-2.5 md:px-4 md:py-3"
              >
                <span className="text-xs font-medium text-text-secondary md:text-sm">
                  {row.label}
                </span>
                {row.show && row.value != null && row.value > 0 ? (
                  <span className="text-sm font-bold text-red-primary md:text-base">
                    {formatBDT(row.value)}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-text-muted md:text-base">
                    —
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-gold-primary/40 bg-white px-3 py-3 md:px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary md:text-sm">
                Total Extra Charges
              </span>
              <span className="text-base font-bold text-red-primary md:text-lg">
                {formatBDT(
                  chargeRows.reduce((sum, r) => {
                    if (r.show && r.value != null && r.value > 0) {
                      return sum + r.value;
                    }
                    return sum;
                  }, 0)
                )}
              </span>
            </div>
          </div>
        </div>

        {(order.paidAmount ?? 0) > 0 && (
          <div className="mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
            <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">Payment</h2>
            <div className="space-y-1.5 text-xs md:text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Paid</span>
                <span className="font-semibold text-success">
                  {formatBDT(order.paidAmount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Due</span>
                <span className="font-semibold text-red-primary">
                  {formatBDT(Math.max(0, order.total - (order.paidAmount ?? 0)))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ FULL-SCREEN IMAGE MODAL */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={fullscreenImage}
            alt=""
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}