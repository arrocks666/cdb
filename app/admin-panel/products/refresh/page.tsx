"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/lib/ProductsContext";

const BATCH_SIZE = 5; // subcategories per batch
const TOTAL_SUBCATEGORIES = 30; // 10 categories x 3 subcategories

type BatchStatus = {
  index: number;
  range: string;
  status: "pending" | "running" | "done" | "error";
  fetched: number;
  kept: number;
  error?: string;
};

export default function RefreshProductsPage() {
  const router = useRouter();
  const { refresh } = useProducts();
  const [running, setRunning] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [batches, setBatches] = useState<BatchStatus[]>(
    Array.from({ length: Math.ceil(TOTAL_SUBCATEGORIES / BATCH_SIZE) }, (_, i) => {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, TOTAL_SUBCATEGORIES);
      return {
        index: i,
        range: `Subcategories ${start + 1}–${end}`,
        status: "pending" as const,
        fetched: 0,
        kept: 0,
      };
    })
  );
  const [totalImported, setTotalImported] = useState(0);
  const [totalFetched, setTotalFetched] = useState(0);
  const [totalKept, setTotalKept] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const allProductsRef = useRef<any[]>([]);

  const updateBatch = (idx: number, patch: Partial<BatchStatus>) => {
    setBatches((prev) =>
      prev.map((b) => (b.index === idx ? { ...b, ...patch } : b))
    );
  };

  const handleStart = async () => {
    setRunning(true);
    setError(null);
    setDone(false);
    setTotalImported(0);
    setTotalFetched(0);
    setTotalKept(0);
    allProductsRef.current = [];

    try {
      // Reset batch statuses
      setBatches((prev) =>
        prev.map((b) => ({
          ...b,
          status: "pending",
          fetched: 0,
          kept: 0,
          error: undefined,
        }))
      );

      for (let i = 0; i < batches.length; i++) {
        setCurrentBatch(i);
        updateBatch(i, { status: "running" });

        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, TOTAL_SUBCATEGORIES);

        try {
          const res = await fetch("/api/admin/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ start, end }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          const products = data.products ?? [];
          const errors = data.errors ?? [];

          // Accumulate products
          allProductsRef.current.push(...products);

          // Fetch count from scraped
          const fetched = products.length + errors.length; // approximation
          const kept = products.length;

          setTotalFetched((t) => t + fetched);
          setTotalKept((t) => t + kept);

          updateBatch(i, {
            status: errors.length > 0 ? "error" : "done",
            fetched,
            kept,
            error: errors.length > 0 ? errors[0] : undefined,
          });
        } catch (err: any) {
          updateBatch(i, { status: "error", error: err.message });
        }
      }

      // Import everything to Firestore
      const allProducts = allProductsRef.current;
      if (allProducts.length > 0) {
        const importRes = await fetch("/api/admin/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: allProducts }),
        });

        if (!importRes.ok) {
          const err = await importRes.json().catch(() => ({}));
          throw new Error(err.error || "Import failed");
        }

        const importData = await importRes.json();
        setTotalImported(importData.imported ?? 0);
      }

      await refresh();
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Scrape failed");
    } finally {
      setRunning(false);
    }
  };

  const progressPct = Math.round(
    (batches.filter((b) => b.status === "done" || b.status === "error").length /
      batches.length) *
      100
  );

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin-panel/products")}
          disabled={running}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-text-muted transition hover:text-gold-primary disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Products
        </button>

        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
          Refresh Products
        </div>

        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Scrape Fresh Products
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Fetches new products from 1688. Takes ~15 minutes. Don't close this tab.
        </p>
      </div>

      {!running && !done && (
        <div className="rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark">
          <div className="text-center">
            <div className="text-5xl opacity-40">🔄</div>
            <h3 className="mt-3 font-serif text-lg font-bold text-text-primary">
              Ready to scrape
            </h3>
            <p className="mt-2 max-w-md mx-auto text-xs text-text-muted">
              This will scrape all 30 subcategories from 1688 in 6 batches.
              English translation happens automatically. Products with
              untranslatable Chinese are skipped.
            </p>
            <button
              onClick={handleStart}
              className="mt-6 rounded-lg bg-gold-primary px-8 py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
            >
              Start Scrape
            </button>
          </div>
        </div>
      )}

      {(running || done || batches.some((b) => b.status !== "pending")) && (
        <div className="rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-text-primary md:text-lg">
                Progress
              </h3>
              <p className="mt-0.5 text-xs text-text-muted">
                {progressPct}% complete
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gold-primary">
                {progressPct}%
              </p>
            </div>
          </div>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-bg-input">
            <div
              className="h-full rounded-full bg-gold-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="space-y-2">
            {batches.map((b) => (
              <div
                key={b.index}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {b.status === "done"
                      ? "✅"
                      : b.status === "error"
                      ? "⚠️"
                      : b.status === "running"
                      ? "🔄"
                      : "⏳"}
                  </span>
                  <span className="text-xs font-medium text-text-primary md:text-sm">
                    {b.range}
                  </span>
                </div>
                <div className="text-right text-[11px] text-text-muted md:text-xs">
                  {b.status === "done" && (
                    <span className="font-medium text-text-primary">
                      {b.kept} products kept
                    </span>
                  )}
                  {b.status === "running" && (
                    <span className="font-medium text-gold-primary">
                      Scraping...
                    </span>
                  )}
                  {b.status === "error" && b.error && (
                    <span className="text-red-primary">{b.error.slice(0, 40)}</span>
                  )}
                  {b.status === "pending" && <span>Waiting</span>}
                </div>
              </div>
            ))}
          </div>

          {done && (
            <div className="mt-5 rounded-lg border border-success/30 bg-success/5 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h4 className="text-sm font-bold text-success md:text-base">
                    Scrape Complete!
                  </h4>
                  <div className="mt-1 space-y-0.5 text-xs text-text-secondary">
                    <p>Products kept: <span className="font-bold text-text-primary">{totalKept}</span></p>
                    <p>Imported to Firestore: <span className="font-bold text-text-primary">{totalImported}</span></p>
                  </div>
                  <button
                    onClick={() => router.push("/admin-panel/products")}
                    className="mt-3 rounded-lg bg-gold-primary px-5 py-2 text-xs font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
                  >
                    View Products →
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}