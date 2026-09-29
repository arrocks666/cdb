"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Order, STATUS_LABELS, OrderStatus } from "@/lib/OrderContext";
import {
  fetchOrdersSince,
  searchOrders,
  computeStats,
  countByStatus,
  startOfDay,
  startOfWeek,
  startOfMonth,
  formatDate,
  formatBDT,
} from "@/lib/adminOrders";

type RangeKey = "today" | "week" | "month" | "all";
type StatusFilter = OrderStatus | "all";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All (30d)",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [range, setRange] = useState<RangeKey>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOrdersSince()
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered by range
  const rangeOrders = useMemo(() => {
    const now = new Date();
    let cutoff = 0;
    if (range === "today") cutoff = startOfDay(now);
    else if (range === "week") cutoff = startOfWeek(now);
    else if (range === "month") cutoff = startOfMonth(now);
    else cutoff = 0;

    return orders.filter((o) => o.createdAt >= cutoff);
  }, [orders, range]);

  // Then by search
  const searchedOrders = useMemo(
    () => searchOrders(rangeOrders, searchTerm),
    [rangeOrders, searchTerm]
  );

  // Then by status
  const visibleOrders = useMemo(() => {
    if (statusFilter === "all") return searchedOrders;
    return searchedOrders.filter((o) => o.status === statusFilter);
  }, [searchedOrders, statusFilter]);

  const stats = computeStats(rangeOrders);
  const statusCounts = countByStatus(rangeOrders);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
            Orders
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
            Manage Orders
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Search, filter, and fulfill customer orders.
          </p>
        </div>

        <Link
          href="/admin-panel/orders/new"
          className="rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
        >
          + New Order
        </Link>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Today"
          revenue={computeStats(
            orders.filter((o) => o.createdAt >= startOfDay())
          ).revenue}
          count={
            orders.filter((o) => o.createdAt >= startOfDay()).length
          }
          icon="💰"
        />
        <StatCard
          label="This Week"
          revenue={computeStats(
            orders.filter((o) => o.createdAt >= startOfWeek())
          ).revenue}
          count={
            orders.filter((o) => o.createdAt >= startOfWeek()).length
          }
          icon="📅"
        />
        <StatCard
          label="This Month"
          revenue={computeStats(
            orders.filter((o) => o.createdAt >= startOfMonth())
          ).revenue}
          count={
            orders.filter((o) => o.createdAt >= startOfMonth()).length
          }
          icon="📈"
        />
      </div>

      {/* Search + range tabs */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order ID, phone, name, or China ID..."
            className="w-full rounded-lg border border-border-subtle bg-white py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                range === r
                  ? "border-gold-primary bg-gold-primary text-white shadow-orange-glow"
                  : "border-border-subtle bg-white text-text-secondary hover:border-gold-primary hover:text-gold-primary"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        <StatusTab
          label="All"
          count={rangeOrders.length}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
          <StatusTab
            key={s}
            label={STATUS_LABELS[s]}
            count={statusCounts[s]}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {/* Summary of filtered */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <span>
          <span className="font-bold text-text-primary">{visibleOrders.length}</span>{" "}
          {visibleOrders.length === 1 ? "order" : "orders"} shown
        </span>
        <span>
          Revenue:{" "}
          <span className="font-bold text-red-primary">
            {formatBDT(computeStats(visibleOrders).revenue)}
          </span>
        </span>
        <span>
          AOV:{" "}
          <span className="font-bold text-text-primary">
            {formatBDT(computeStats(visibleOrders).aov)}
          </span>
        </span>
      </div>

      {/* Order list */}
      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-white p-10 text-center shadow-card-dark">
            <div className="text-5xl opacity-40">📭</div>
            <h3 className="mt-3 font-serif text-base font-bold text-text-primary md:text-lg">
              No orders found
            </h3>
            <p className="mt-1 text-xs text-text-muted md:text-sm">
              {searchTerm
                ? `Nothing matches "${searchTerm}"`
                : "Try a different time range or create a new order."}
            </p>
          </div>
        ) : (
          visibleOrders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  revenue,
  count,
  icon,
}: {
  label: string;
  revenue: number;
  count: number;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-red-primary md:text-3xl">
            {formatBDT(revenue)}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            {count} {count === 1 ? "order" : "orders"}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-orange text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-gold-primary bg-gold-primary text-white"
          : "border-border-subtle bg-white text-text-secondary hover:border-gold-primary hover:text-gold-primary"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          active ? "bg-white/20 text-white" : "bg-bg-input text-text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function OrderRow({ order }: { order: Order }) {
  const isManual = order.userId === "admin-manual";
  const itemCount = order.items.length;
  const firstItem = order.items[0];

  return (
    <Link
      href={`/admin-panel/orders/${order.id}`}
      className="group block rounded-lg border border-border-subtle bg-white p-3 shadow-card-dark transition hover:border-gold-primary hover:shadow-card-hover md:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gold-primary md:text-base">
              #{order.id}
            </span>
            {isManual && (
              <span className="rounded-full bg-bg-input px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Manual
              </span>
            )}
            <span className="rounded-full border border-gold-primary/40 bg-bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] text-text-secondary md:grid-cols-3 md:text-xs">
            <div>
              <span className="text-text-muted">Customer:</span>{" "}
              <span className="font-medium text-text-primary">
                {order.address?.name || "—"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Phone:</span>{" "}
              <span className="font-medium text-text-primary">
                {order.address?.phone || "—"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Date:</span>{" "}
              <span className="font-medium text-text-primary">
                {formatDate(order.createdAt)}
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted md:text-xs">
            <span>
              {itemCount} {itemCount === 1 ? "item" : "items"}
              {firstItem && firstItem.title
                ? ` • ${firstItem.title.slice(0, 40)}${
                    firstItem.title.length > 40 ? "…" : ""
                  }`
                : ""}
            </span>
            {order.chinaOrderId && (
              <span className="rounded bg-bg-orange px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gold-primary">
                CN: {order.chinaOrderId}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">
            Total
          </p>
          <p className="text-base font-bold text-red-primary md:text-lg">
            {formatBDT(order.total)}
          </p>
          <span className="mt-1 inline-block text-[11px] font-medium text-gold-primary md:text-xs">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}