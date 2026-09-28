"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrders, STATUS_ORDER, STATUS_LABELS, OrderStatus } from "@/lib/OrderContext";
import { products, formatBDT } from "@/lib/data";

function OrderImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="text-xl">📦</span>;
  return <img src={src} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} />;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const orders = useOrders();
  const order = orders.getOrder(id);

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
              if (!product) return null;
              return (
                <div key={i} className="flex items-center gap-3 border-b border-border-subtle pb-3 last:border-b-0 last:pb-0">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-white p-1">
                    <OrderImage src={product.image} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary md:text-base">{product.title}</p>
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
      </div>
    </div>
  );
}