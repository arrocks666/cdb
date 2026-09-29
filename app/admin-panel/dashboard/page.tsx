"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Order } from "@/lib/OrderContext";
import {
  fetchOrdersSince,
  computeStats,
  countByStatus,
  startOfDay,
  startOfWeek,
  startOfMonth,
  groupByDay,
  formatBDT,
} from "@/lib/adminOrders";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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

  const todayOrders = orders.filter((o) => o.createdAt >= startOfDay());
  const weekOrders = orders.filter((o) => o.createdAt >= startOfWeek());
  const monthOrders = orders.filter((o) => o.createdAt >= startOfMonth());

  const todayStats = computeStats(todayOrders);
  const weekStats = computeStats(weekOrders);
  const monthStats = computeStats(monthOrders);
  const allStats = computeStats(orders);

  const statusCounts = countByStatus(monthOrders);
  const pendingOrders =
    statusCounts.placed +
    statusCounts.confirmed +
    statusCounts.processing;

  const dailyData = groupByDay(monthOrders);
  const maxRevenue = Math.max(
    1,
    ...dailyData.map((d) => d.revenue)
  );

  // Fill missing days of current month so chart has full width
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const chartData: Array<{ day: number; revenue: number }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d).padStart(2, "0")}`;
    const match = dailyData.find((x) => x.date === key);
    chartData.push({ day: d, revenue: match?.revenue ?? 0 });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
              Owner Dashboard
            </div>
            <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
              Welcome back, <span className="gold-text">Owner</span>
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Here's your store overview for this month.
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Today
            </p>
            <p className="text-sm font-semibold text-text-primary">
              {today.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Primary stats — revenue focused */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="Today's Revenue"
          value={formatBDT(todayStats.revenue)}
          sub={`${todayStats.count} ${
            todayStats.count === 1 ? "order" : "orders"
          }`}
          icon="💰"
          accent="red"
        />
        <BigStat
          label="This Week"
          value={formatBDT(weekStats.revenue)}
          sub={`${weekStats.count} ${
            weekStats.count === 1 ? "order" : "orders"
          }`}
          icon="📅"
          accent="gold"
        />
        <BigStat
          label="This Month"
          value={formatBDT(monthStats.revenue)}
          sub={`${monthStats.count} ${
            monthStats.count === 1 ? "order" : "orders"
          }`}
          icon="📈"
          accent="red"
        />
        <BigStat
          label="Total Orders"
          value={String(allStats.count)}
          sub="Last 30 days"
          icon="🧾"
          accent="gold"
        />
      </div>

      {/* Second row — operations */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmallStat
          label="Pending Orders"
          value={String(pendingOrders)}
          icon="⏳"
        />
        <SmallStat
          label="Delivered"
          value={String(statusCounts.delivered)}
          icon="✅"
        />
        <SmallStat
          label="Average Order"
          value={formatBDT(monthStats.aov)}
          icon="📊"
        />
        <SmallStat
          label="Manual Orders"
          value={String(
            monthOrders.filter((o) => o.userId === "admin-manual").length
          )}
          icon="✍️"
        />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-3 font-serif text-lg font-bold text-text-primary">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickAction
            href="/admin-panel/orders/new"
            icon="✍️"
            label="Create Order"
          />
          <QuickAction
            href="/admin-panel/orders"
            icon="🧾"
            label="View Orders"
          />
          <QuickAction
            href="/admin-panel/products"
            icon="📦"
            label="Manage Products"
          />
          <QuickAction
            href="/admin-panel/settings"
            icon="⚙️"
            label="Store Settings"
          />
        </div>
      </div>

      {/* Revenue chart */}
      <div className="mt-8 rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-text-primary md:text-lg">
              Revenue This Month
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              {monthOrders.length} orders · {formatBDT(monthStats.revenue)} total
            </p>
          </div>
          <span className="rounded-full bg-bg-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
            Live
          </span>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="flex h-40 items-end gap-1 rounded-lg bg-bg-input p-3">
              {chartData.map((d) => {
                const heightPct =
                  d.revenue > 0 ? Math.max(6, (d.revenue / maxRevenue) * 100) : 0;
                return (
                  <div
                    key={d.day}
                    className="group relative flex-1 rounded-t bg-gradient-to-t from-gold-primary to-gold-luxury transition hover:from-red-primary hover:to-red-bright"
                    style={{ height: `${heightPct}%`, minHeight: "2px" }}
                    title={`Day ${d.day}: ${formatBDT(d.revenue)}`}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-text-muted">
              {monthStats.revenue > 0
                ? `Peak day: ${formatBDT(maxRevenue)}`
                : "No revenue yet this month"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  accent: "gold" | "red";
}) {
  const accentColor =
    accent === "gold" ? "text-gold-primary" : "text-red-primary";
  const accentBg = accent === "gold" ? "bg-bg-orange" : "bg-red-primary/10";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p
            className={`mt-2 truncate text-2xl font-bold md:text-3xl ${accentColor}`}
          >
            {value}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">{sub}</p>
        </div>
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-xl ${accentBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bg-input text-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold text-text-primary">{value}</p>
        <p className="text-[11px] text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-white p-4 text-center shadow-card-dark transition hover:-translate-y-0.5 hover:border-gold-primary hover:shadow-card-hover"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-orange text-2xl transition group-hover:bg-gold-primary group-hover:text-white">
        {icon}
      </div>
      <span className="text-xs font-semibold text-text-primary group-hover:text-gold-primary">
        {label}
      </span>
    </Link>
  );
}