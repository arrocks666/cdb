"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTopViewedThisMonth,
  getTodayVisitors,
  getMonthlyUniqueVisitors,
  getMonthlyVisitors,
  cleanupOldAnalytics,
  shouldRunCleanup,
  markCleanupDone,
} from "@/lib/firestoreAnalytics";

type TopProduct = {
  productId: string;
  productTitle: string;
  productImage: string;
  productPrice?: number;
  isLive: boolean;
  views: number;
};

export default function AdminAnalyticsPage() {
  const [topStored, setTopStored] = useState<TopProduct[]>([]);
  const [topLive, setTopLive] = useState<TopProduct[]>([]);
  const [todayVisitors, setTodayVisitors] = useState(0);
  const [monthUnique, setMonthUnique] = useState(0);
  const [dailyVisitors, setDailyVisitors] = useState<Array<{ date: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [stored, live, today, unique, monthly] = await Promise.all([
        getTopViewedThisMonth(10, false),
        getTopViewedThisMonth(10, true),
        getTodayVisitors(),
        getMonthlyUniqueVisitors(),
        getMonthlyVisitors(),
      ]);
      setTopStored(stored);
      setTopLive(live);
      setTodayVisitors(today);
      setMonthUnique(unique);
      setDailyVisitors(monthly.map((m) => ({ date: m.date, count: m.count })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldRunCleanup()) {
      cleanupOldAnalytics().then(() => markCleanupDone()).catch(() => {});
    }
    loadAll();
  }, []);

  const handleCleanup = async () => {
    if (!confirm("Delete all analytics data older than this month?\n\nThis keeps Firestore small. Cannot be undone.")) return;
    setCleaning(true);
    setCleanResult(null);
    try {
      const res = await cleanupOldAnalytics();
      markCleanupDone();
      setCleanResult(`Deleted ${res.deletedViews} views and ${res.deletedStats} visitor records.`);
      await loadAll();
    } finally {
      setCleaning(false);
    }
  };

  const maxDaily = Math.max(1, ...dailyVisitors.map((d) => d.count));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
            Analytics
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
            Store Analytics
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            This month's views and visitors. Resets on the 1st of every month.
          </p>
        </div>

        <button onClick={handleCleanup} disabled={cleaning} className="rounded-lg border border-red-primary/40 bg-white px-4 py-2.5 text-sm font-semibold text-red-primary transition hover:bg-red-primary hover:text-white disabled:opacity-40">
          {cleaning ? "Cleaning..." : "Cleanup Old Data"}
        </button>
      </div>

      {cleanResult && (
        <div className="mb-5 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-xs text-success">
          {cleanResult}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today's Visitors" value={String(todayVisitors)} icon="👥" accent="gold" />
        <StatCard label="Unique This Month" value={String(monthUnique)} icon="🎯" accent="red" />
        <StatCard label="Days Tracked" value={String(dailyVisitors.length)} icon="📅" accent="gold" />
      </div>

      <div className="mt-6 rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark">
        <div className="mb-4">
          <h3 className="font-serif text-base font-bold text-text-primary md:text-lg">Visitors This Month</h3>
          <p className="mt-0.5 text-xs text-text-muted">Daily unique visitor counts</p>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
          </div>
        ) : dailyVisitors.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg bg-bg-input text-center">
            <div className="text-3xl opacity-40">📊</div>
            <p className="mt-2 text-xs text-text-muted">No visitor data yet this month</p>
          </div>
        ) : (
          <div className="flex h-32 items-end gap-1 rounded-lg bg-bg-input p-3">
            {dailyVisitors.map((d) => {
              const pct = (d.count / maxDaily) * 100;
              return (
                <div key={d.date} className="flex-1 rounded-t bg-gradient-to-t from-gold-primary to-gold-luxury transition" style={{ height: `${Math.max(6, pct)}%` }} title={`${d.date}: ${d.count} visitors`} />
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopList title="Top 10 Stored Products" subtitle="Most viewed from your catalog this month" items={topStored} loading={loading} hrefPrefix="/admin-panel/products" accent="gold" />
        <TopList title="Top 10 Live Products" subtitle="Searched products not yet in your catalog" items={topLive} loading={loading} hrefPrefix="/live-product" accent="red" />
      </div>

      <div className="mt-6 rounded-lg border border-border-subtle bg-bg-input p-4 text-xs text-text-muted">
        <p>
          <span className="font-semibold text-text-primary">Auto-cleanup:</span> Analytics data older than the current month is deleted automatically. This keeps Firestore small and free. Order data and product data are never affected.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent: "gold" | "red" }) {
  const color = accent === "gold" ? "text-gold-primary" : "text-red-primary";
  const bg = accent === "gold" ? "bg-bg-orange" : "bg-red-primary/10";
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
          <p className={`mt-2 text-2xl font-bold md:text-3xl ${color}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg text-xl ${bg}`}>{icon}</div>
      </div>
    </div>
  );
}

function TopList({ title, subtitle, items, loading, hrefPrefix, accent }: { title: string; subtitle: string; items: TopProduct[]; loading: boolean; hrefPrefix: string; accent: "gold" | "red" }) {
  const badge = accent === "gold" ? "bg-bg-orange text-gold-primary" : "bg-red-primary/10 text-red-primary";
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
      <div className="mb-4">
        <h3 className="font-serif text-base font-bold text-text-primary md:text-lg">{title}</h3>
        <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-bg-input py-10 text-center">
          <div className="text-3xl opacity-40">👁️</div>
          <p className="mt-2 text-xs text-text-muted">No views recorded this month yet</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((item, idx) => (
            <li key={item.productId}>
              <Link href={`${hrefPrefix}/${item.productId}`} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-white p-2 transition hover:border-gold-primary hover:bg-bg-input">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-white">{idx + 1}</span>
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
                  {item.productImage ? (
                    <img src={item.productImage} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-lg">📦</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-medium text-text-primary md:text-sm">{item.productTitle}</p>
                  {item.productPrice !== undefined && (
                    <p className="mt-0.5 text-[11px] font-bold text-red-primary">৳{Math.round(item.productPrice).toLocaleString("en-IN")}</p>
                  )}
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badge}`}>
                  {item.views} {item.views === 1 ? "view" : "views"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}