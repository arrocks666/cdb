"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, STATUS_LABELS } from "@/lib/OrderContext";
import { formatBDT, formatDate } from "@/lib/adminOrders";

type Props = {
  user: {
    uid: string;
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  onClose: () => void;
};

export default function UserOrdersModal({ user, onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);
    setOrders([]);

    (async () => {
      try {
        // Fetch by userId
        const byUid = new Set<string>();
        const collected: Order[] = [];

        try {
          const q1 = query(
            collection(db, "orders"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          const snap1 = await getDocs(q1);
          snap1.docs.forEach((d) => {
            byUid.add(d.id);
            collected.push({ id: d.id, ...(d.data() as Omit<Order, "id">) });
          });
        } catch (e) {
          console.warn("userId query failed:", e);
        }

        // Also fetch by phone (catches manual orders)
        if (user.phone) {
          try {
            const q2 = query(
              collection(db, "orders"),
              where("address.phone", "==", user.phone),
              orderBy("createdAt", "desc")
            );
            const snap2 = await getDocs(q2);
            snap2.docs.forEach((d) => {
              if (byUid.has(d.id)) return;
              collected.push({ id: d.id, ...(d.data() as Omit<Order, "id">) });
            });
          } catch (e) {
            console.warn("phone query failed:", e);
          }
        }

        // Sort merged list by createdAt desc
        collected.sort((a, b) => b.createdAt - a.createdAt);

        if (!cancelled) setOrders(collected);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  // Compute totals
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const totalPaid = orders.reduce(
    (sum, o) => sum + (o.paidAmount ?? o.total),
    0
  );
  const totalDue = Math.max(0, totalSpent - totalPaid);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-text-primary md:text-lg">
              {user.name || "Unnamed User"}
            </h2>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              {user.phone || "No phone"} • {orders.length}{" "}
              {orders.length === 1 ? "order" : "orders"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-bg-input hover:text-red-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 border-b border-border-subtle bg-bg-input px-4 py-3 md:gap-3 md:px-5 md:py-4">
          <div className="rounded-lg border border-border-subtle bg-white p-2.5 text-center md:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Total Spent
            </p>
            <p className="mt-1 text-sm font-bold text-text-primary md:text-lg">
              {formatBDT(totalSpent)}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-white p-2.5 text-center md:p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Total Paid
            </p>
            <p className="mt-1 text-sm font-bold text-success md:text-lg">
              {formatBDT(totalPaid)}
            </p>
          </div>
          <div
            className={`rounded-lg border-2 p-2.5 text-center md:p-3 ${
              totalDue > 0
                ? "border-red-primary bg-red-primary/5"
                : "border-success bg-success/5"
            }`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${
                totalDue > 0 ? "text-red-primary" : "text-success"
              }`}
            >
              Total Due
            </p>
            <p
              className={`mt-1 text-sm font-bold md:text-lg ${
                totalDue > 0 ? "text-red-primary" : "text-success"
              }`}
            >
              {formatBDT(totalDue)}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-5xl opacity-40">📭</div>
              <h3 className="mt-3 text-base font-bold text-text-primary md:text-lg">
                No orders for this user
              </h3>
              <p className="mt-1 text-xs text-text-muted md:text-sm">
                This user hasn't placed any orders yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => {
                const paid = order.paidAmount ?? order.total;
                const due = Math.max(0, order.total - paid);
                const isFullyPaid = due === 0;
                const itemCount = order.items.length;

                return (
                  <Link
                    key={order.id}
                    href={`/admin-panel/orders/${order.id}`}
                    className="block rounded-lg border border-border-subtle bg-white p-3 transition hover:border-gold-primary hover:shadow-md md:p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-gold-primary md:text-base">
                            #{order.id}
                          </span>
                          <span className="rounded-full border border-gold-primary/40 bg-bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
                            {STATUS_LABELS[order.status]}
                          </span>
                          {isFullyPaid ? (
                            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                              ✅ Paid
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-primary">
                              ⏳ Due
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-text-muted md:text-xs">
                          {formatDate(order.createdAt)} • {itemCount}{" "}
                          {itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-text-primary md:text-base">
                          {formatBDT(order.total)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-muted md:text-xs">
                          Paid:{" "}
                          <span className="font-semibold text-success">
                            {formatBDT(paid)}
                          </span>
                        </p>
                        {due > 0 && (
                          <p className="mt-0.5 text-[10px] text-red-primary md:text-xs">
                            Due:{" "}
                            <span className="font-bold">{formatBDT(due)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle px-4 py-3 md:px-5">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-border-subtle bg-white py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-bg-input md:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}