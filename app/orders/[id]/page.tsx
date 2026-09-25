"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useOrders,
  STATUS_ORDER,
  STATUS_LABELS,
  OrderStatus,
} from "@/lib/OrderContext";
import { products, formatBDT } from "@/lib/data";

function proxyImage(url: string | undefined | null): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const orders = useOrders();
  const order = orders.getOrder(id);

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="text-6xl opacity-60">📦</div>
        <h1 className="mt-4 font-serif text-xl font-bold">
          <span className="gold-text">Order not found</span>
        </h1>
        <p className="mt-2 text-xs text-text-muted">
          Order ID: <span className="text-red-primary">{id}</span>
        </p>
        <Link
          href="/orders"
          className="mt-5 inline-block rounded-full bg-red-primary px-6 py-2.5 text-xs font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const createdDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <div
        className="sticky top-[56px] z-40 border-b border-border-subtle shadow-lg md:top-[60px]"
        style={{ backgroundColor: "#080808" }}
      >
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/orders")}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-lg font-bold leading-none md:text-xl">
              <span className="gold-text">Track Order</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              Order #{order.id}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
        <div className="rounded-xl border border-gold-primary/40 bg-gradient-to-br from-red-dark/15 via-bg-card to-bg-card p-4 shadow-card-dark md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-text-muted md:text-xs">Order ID</p>
              <p className="font-serif text-base font-bold text-red-primary md:text-lg">
                #{order.id}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-text-muted md:text-xs">Placed on</p>
              <p className="text-sm font-medium text-text-primary md:text-base">
                {createdDate}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
            <span className="text-xs text-text-secondary md:text-sm">
              {order.items.length}{" "}
              {order.items.length === 1 ? "item" : "items"}
            </span>
            <span className="text-base font-bold text-red-primary md:text-lg">
              {formatBDT(order.total)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
          <h2 className="mb-4 font-serif text-base font-bold text-gold-primary md:text-lg">
            Tracking Timeline
          </h2>

          <div className="relative">
            {STATUS_ORDER.map((status, i) => {
              const isDone = i < currentIndex;
              const isCurrent = i === currentIndex;

              return (
                <div key={status} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < STATUS_ORDER.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-8 h-full w-0.5 ${
                        isDone ? "bg-success" : "bg-border-subtle"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isDone
                        ? "border-success bg-success text-white"
                        : isCurrent
                          ? "border-red-primary bg-red-primary text-white shadow-red-glow"
                          : "border-border-subtle bg-bg-card-elevated text-text-muted"
                    }`}
                  >
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isCurrent ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-text-muted" />
                    )}
                  </div>

                  <div className="flex-1 pt-1">
                    <p
                      className={`text-sm font-semibold md:text-base ${
                        isDone
                          ? "text-success"
                          : isCurrent
                            ? "text-red-primary"
                            : "text-text-muted"
                      }`}
                    >
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

          <div className="mt-4 flex items-center justify-center gap-3 rounded-lg border border-gold-primary/30 bg-bg-card-elevated p-3">
            <span className="text-2xl">🏯</span>
            <span className="text-xs font-medium text-gold-primary md:text-sm">
              China
            </span>
            <svg width="60" height="14" viewBox="0 0 60 14" fill="none">
              <line x1="0" y1="7" x2="52" y2="7" stroke="#D6A84A" strokeWidth="1" strokeDasharray="3 3" />
              <polygon points="52,2 60,7 52,12" fill="#E31B16" />
            </svg>
            <span className="text-xs font-medium text-red-primary md:text-sm">
              Bangladesh
            </span>
            <span className="text-2xl">🇧🇩</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
          <h2 className="mb-3 font-serif text-base font-bold text-gold-primary md:text-lg">
            Delivery Address
          </h2>
          <p className="text-sm font-semibold text-text-primary md:text-base">
            {order.address.name}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary md:text-sm">
            {order.address.phone}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary md:text-sm">
            {order.address.address}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary md:text-sm">
            {order.address.district}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
          <h2 className="mb-3 font-serif text-base font-bold text-gold-primary md:text-lg">
            Order Items
          </h2>
          <div className="space-y-3">
            {order.items.map((item, i) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product) return null;
              const color = product.colors.find((c) => c.id === item.colorId);
              const imageUrl = proxyImage(product.image);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-border-subtle pb-3 last:border-b-0 last:pb-0"
                >
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold-primary/40 bg-bg-card-elevated"
                    style={{ color: "transparent", fontSize: "0px" }}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          if (img.parentElement) {
                            img.parentElement.innerHTML =
                              '<span class="text-xl">📦</span>';
                          }
                        }}
                      />
                    ) : (
                      <span className="text-xl">📦</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary md:text-base">
                      {product.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-muted md:text-xs">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-border-subtle"
                        style={{ background: color?.hex ?? "#000" }}
                      />
                      {color?.label ?? "Default"} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-primary md:text-base">
                    {formatBDT(item.price * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-3 text-xs md:text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="text-text-primary">{formatBDT(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Shipping</span>
              <span className="text-text-primary">{formatBDT(order.shipping)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Payment</span>
              <span className="text-text-primary">{order.paymentMethod}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border-subtle pt-2">
              <span className="font-semibold text-text-primary md:text-base">Total</span>
              <span className="text-base font-bold text-red-primary md:text-lg">
                {formatBDT(order.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}