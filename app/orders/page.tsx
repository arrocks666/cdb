"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrders, STATUS_LABELS } from "@/lib/OrderContext";
import { products, formatBDT } from "@/lib/data";

export default function OrdersPage() {
  const router = useRouter();
  const orders = useOrders();

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/account")} className="flex h-8 w-8 items-center justify-center text-text-primary hover:text-gold-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none text-text-primary md:text-xl">My Orders</h1>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">{orders.orders.length} {orders.orders.length === 1 ? "Order" : "Orders"}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
        {orders.orders.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">📦</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">No orders yet</h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">When you place an order, it will appear here.</p>
            <button onClick={() => router.push("/")} className="mt-5 rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow">Start Shopping</button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.orders.map((order) => {
              const createdDate = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
              const firstItem = order.items[0];
              const firstProduct = products.find((p) => p.id === firstItem?.productId);
              return (
                <Link key={order.id} href={`/orders/${order.id}`} className="group block overflow-hidden rounded-lg border border-border-subtle bg-white p-3 shadow-card-dark transition hover:shadow-card-hover md:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-text-muted md:text-xs">Order ID</p>
                      <p className="text-sm font-bold text-gold-primary md:text-base">#{order.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-text-muted md:text-xs">Total</p>
                      <p className="text-sm font-bold text-red-primary md:text-base">{formatBDT(order.total)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 border-t border-border-subtle pt-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-white text-xl">
                      {firstProduct?.image ? (
                        <img src={firstProduct.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (<span>📦</span>)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {firstProduct?.title ?? "Product"}
                        {order.items.length > 1 && <span className="text-text-muted"> + {order.items.length - 1} more</span>}
                      </p>
                      <p className="mt-0.5 text-[11px] text-text-muted">{createdDate}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gold-primary transition group-hover:translate-x-0.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-primary/40 bg-bg-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary md:text-xs">
                      ● {STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-[11px] font-medium text-gold-primary md:text-xs">Track →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}