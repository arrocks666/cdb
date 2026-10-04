"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/categories";

type JobStatus =
  | "idle"
  | "queued"
  | "searching"
  | "loading"
  | "done"
  | "error"
  | "cancelled";

type JobState = {
  jobId: string | null;
  status: JobStatus;
  imported: number;
  failed: number;
  totalExpected: number;
  error?: string;
};

// Cost: $0.01 per 1,000 parsebird results + $0.01 per Pizani product
const PARSEBIRD_COST_PER_RESULT = 0.00001;
const PIZANI_COST_PER_PRODUCT = 0.01;

function estimateCost(count: number): number {
  return count * PIZANI_COST_PER_PRODUCT + count * 1.5 * PARSEBIRD_COST_PER_RESULT;
}

export default function ImportProductsPage() {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [count, setCount] = useState(30);

  const [job, setJob] = useState<JobState>({
    jobId: null,
    status: "idle",
    imported: 0,
    failed: 0,
    totalExpected: 0,
  });

  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentCategory = categories.find((c) => c.id === categoryId);

  // Auto-select first subcategory when category changes
  useEffect(() => {
    const first = currentCategory?.subcategories[0]?.id ?? "";
    setSubcategoryId(first);
  }, [categoryId, currentCategory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const handleStart = async () => {
    if (!categoryId || !subcategoryId) return;
    if (count < 1 || count > 500) {
      alert("Count must be between 1 and 500");
      return;
    }

    setStarting(true);
    setJob({
      jobId: null,
      status: "queued",
      imported: 0,
      failed: 0,
      totalExpected: 0,
    });

    try {
      const res = await fetch("/api/admin/bulk-import/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, subcategoryId, targetCount: count }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const jobId = data.jobId;
      if (!jobId) throw new Error("No jobId returned");

      setJob((prev) => ({ ...prev, jobId, status: "queued" }));
      startPolling(jobId);
    } catch (err: any) {
      console.error(err);
      setJob((prev) => ({
        ...prev,
        status: "error",
        error: err?.message ?? "Failed to start",
      }));
      setStarting(false);
    }
  };

  const startPolling = (jobId: string) => {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const statusRes = await fetch(
          `/api/admin/bulk-import/status?jobId=${jobId}`
        );
        if (!statusRes.ok) {
          pollRef.current = setTimeout(poll, 3000);
          return;
        }
        const statusData = await statusRes.json();

        setJob({
          jobId,
          status: statusData.status,
          imported: statusData.imported ?? 0,
          failed: statusData.failed ?? 0,
          totalExpected: statusData.totalExpected ?? 0,
          error: statusData.error,
        });

        // Done states → stop
        if (
          statusData.status === "done" ||
          statusData.status === "error" ||
          statusData.status === "cancelled"
        ) {
          setStarting(false);
          setCancelling(false);
          return;
        }

        // If searching → wait and re-check
        if (statusData.status === "queued" || statusData.status === "searching") {
          pollRef.current = setTimeout(poll, 3000);
          return;
        }

        // If loading → trigger next batch
        if (statusData.status === "loading") {
          const runRes = await fetch("/api/admin/bulk-import/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          });

          if (!runRes.ok) {
            pollRef.current = setTimeout(poll, 3000);
            return;
          }

          const runData = await runRes.json();

          setJob((prev) => ({
            ...prev,
            imported: runData.imported ?? prev.imported,
            failed: runData.failed ?? prev.failed,
            totalExpected: runData.totalExpected ?? prev.totalExpected,
          }));

          if (runData.done) {
            const finalRes = await fetch(
              `/api/admin/bulk-import/status?jobId=${jobId}`
            );
            if (finalRes.ok) {
              const finalData = await finalRes.json();
              setJob({
                jobId,
                status: finalData.status,
                imported: finalData.imported ?? 0,
                failed: finalData.failed ?? 0,
                totalExpected: finalData.totalExpected ?? 0,
                error: finalData.error,
              });
            }
            setStarting(false);
            return;
          }

          pollRef.current = setTimeout(poll, 1500);
          return;
        }
      } catch (err) {
        console.warn("Poll error:", err);
        pollRef.current = setTimeout(poll, 3000);
      }
    };

    poll();
  };

  const handleCancel = async () => {
    if (!job.jobId) return;
    if (!confirm("Cancel this import? Already-imported products will be kept.")) return;

    setCancelling(true);
    try {
      await fetch("/api/admin/bulk-import/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setJob({
      jobId: null,
      status: "idle",
      imported: 0,
      failed: 0,
      totalExpected: 0,
    });
    setStarting(false);
    setCancelling(false);
  };

  const isRunning =
    job.status === "queued" ||
    job.status === "searching" ||
    job.status === "loading";

  const progressPct =
    job.totalExpected > 0
      ? Math.round(((job.imported + job.failed) / job.totalExpected) * 100)
      : 0;

  const estimatedCost = estimateCost(count);

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin-panel/products")}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-text-muted transition hover:text-gold-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Products
        </button>

        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
          Bulk Import
        </div>

        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Import from 1688
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Import top-selling products by category. Existing products are updated (upsert by offer ID).
        </p>
      </div>

      {!isRunning && job.status === "idle" && (
        <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark md:p-6">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Configure Import
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Subcategory
              </label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              >
                {currentCategory?.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — "{s.keyword}"
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                How many products to import
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 30)}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none md:max-w-xs"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Top-selling products will be selected automatically.
              </p>
            </div>

            <div className="rounded-lg border-2 border-gold-primary/40 bg-bg-orange p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Estimated Cost
                </span>
                <span className="text-lg font-bold text-red-primary">
                  ${estimatedCost.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-text-muted">
                {count} products × ~$0.01001 per product (Apify usage)
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleStart}
                disabled={starting}
                className="rounded-lg bg-gold-primary px-6 py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
              >
                {starting ? "Starting..." : "Start Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(isRunning || job.status === "done" || job.status === "error" || job.status === "cancelled") && (
        <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
                {job.status === "queued" && "Starting..."}
                {job.status === "searching" && "Searching 1688..."}
                {job.status === "loading" && "Importing products..."}
                {job.status === "done" && "Import complete ✓"}
                {job.status === "error" && "Import failed"}
                {job.status === "cancelled" && "Import cancelled"}
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {job.status === "loading" &&
                  `${job.imported + job.failed} of ${job.totalExpected} processed`}
                {job.status === "done" &&
                  `${job.imported} imported, ${job.failed} failed`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gold-primary">{progressPct}%</p>
            </div>
          </div>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-bg-input">
            <div
              className="h-full rounded-full bg-gold-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border-subtle bg-bg-input p-3 text-center">
              <p className="text-2xl font-bold text-success">{job.imported}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Imported
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-input p-3 text-center">
              <p className="text-2xl font-bold text-red-primary">{job.failed}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Failed
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-input p-3 text-center">
              <p className="text-2xl font-bold text-text-primary">
                {job.totalExpected}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Total
              </p>
            </div>
          </div>

          {job.error && (
            <div className="mt-4 rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
              {job.error}
            </div>
          )}

          {/* ✅ Cancel button — shows as soon as import starts */}
          {isRunning && (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-[11px] text-text-muted">
                Please keep this tab open. You can cancel anytime.
              </p>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-lg border-2 border-red-primary bg-white px-4 py-2 text-sm font-semibold text-red-primary transition hover:bg-red-primary hover:text-white disabled:opacity-40"
              >
                {cancelling ? "Cancelling..." : "Cancel Import"}
              </button>
            </div>
          )}

          {job.status === "done" && (
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleReset}
                className="rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-gold-primary hover:text-gold-primary"
              >
                Import More
              </button>
              <button
                onClick={() => router.push("/admin-panel/products")}
                className="rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
              >
                View Products
              </button>
            </div>
          )}

          {(job.status === "error" || job.status === "cancelled") && (
            <div className="mt-5 flex justify-end">
              <button
                onClick={handleReset}
                className="rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}