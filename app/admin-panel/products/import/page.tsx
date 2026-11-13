"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/categories";
import { db } from "@/lib/firebase";
// ✅ Import where for filtering
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import type { Product } from "@/lib/ProductsContext";
import { formatBDT } from "@/lib/data";

type JobStatus = "idle" | "queued" | "searching" | "loading" | "done" | "error" | "cancelled";

type JobState = {
  jobId: string | null;
  status: JobStatus;
  imported: number;
  failed: number;
  totalExpected: number;
  error?: string;
};

const PIZANI_COST_PER_PRODUCT = 0.01;

export default function ImportProductsPage() {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [countInput, setCountInput] = useState("5"); 

  const [job, setJob] = useState<JobState>({
    jobId: null,
    status: "idle",
    imported: 0,
    failed: 0,
    totalExpected: 0,
  });

  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [recentImports, setRecentImports] = useState<Product[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const currentCategory = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    const first = currentCategory?.subcategories[0]?.id ?? "";
    setSubcategoryId(first);
  }, [categoryId, currentCategory]);

  // ✅ FIX: Fetch only products from the last 24 hours
  const fetchRecentImports = async () => {
    setLoadingRecent(true);
    try {
      // Calculate timestamp for 24 hours ago
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

      const q = query(
        collection(db, "products"),
        where("savedAt", ">=", twentyFourHoursAgo), // Only get recent ones
        orderBy("savedAt", "desc"),
        limit(20)
      );

      const snap = await getDocs(q);
      const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      
      setRecentImports(items);
    } catch (err) {
      console.error("Failed to fetch recent imports:", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentImports();
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const handleStart = async () => {
    if (!categoryId || !subcategoryId) return;
    
    const count = Number(countInput);
    if (!count || count < 1 || count > 500) {
      alert("Count must be between 1 and 500");
      return;
    }

    setStarting(true);
    setJob({ jobId: null, status: "queued", imported: 0, failed: 0, totalExpected: count });

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
      setJob((prev) => ({ ...prev, status: "error", error: err?.message ?? "Failed to start" }));
      setStarting(false);
    }
  };

  const startPolling = (jobId: string) => {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const statusRes = await fetch(`/api/admin/bulk-import/status?jobId=${jobId}`);
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

        if (statusData.status === "done" || statusData.status === "error" || statusData.status === "cancelled") {
          setStarting(false);
          fetchRecentImports(); // Refresh list when done
          return;
        }

        pollRef.current = setTimeout(poll, 2000);
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
    setJob({ jobId: null, status: "idle", imported: 0, failed: 0, totalExpected: 0 });
    setStarting(false);
  };

  const isRunning = job.status === "queued" || job.status === "searching" || job.status === "loading";
  const progressPct = job.totalExpected > 0 ? Math.round(((job.imported + job.failed) / job.totalExpected) * 100) : 0;
  
  const countNum = Number(countInput) || 0;
  const estimatedCost = countNum * PIZANI_COST_PER_PRODUCT;

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

      {/* Configuration Section */}
      {!isRunning && job.status === "idle" && (
        <div className="mb-8 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark md:p-6">
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
                type="text"
                inputMode="numeric"
                value={countInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCountInput(val);
                }}
                placeholder="e.g. 5"
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none md:max-w-xs"
              />
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
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleStart}
                disabled={starting || !countInput}
                className="rounded-lg bg-gold-primary px-6 py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
              >
                {starting ? "Starting..." : "Start Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {(isRunning || job.status === "done" || job.status === "error" || job.status === "cancelled") && (
        <div className="mb-8 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark md:p-6">
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
                {job.status === "loading" && `${job.imported + job.failed} of ${job.totalExpected} processed`}
                {job.status === "done" && `${job.imported} imported, ${job.failed} failed`}
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
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Imported</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-input p-3 text-center">
              <p className="text-2xl font-bold text-red-primary">{job.failed}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Failed</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-input p-3 text-center">
              <p className="text-2xl font-bold text-text-primary">{job.totalExpected}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Total</p>
            </div>
          </div>

          {job.error && (
            <div className="mt-4 rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
              {job.error}
            </div>
          )}

          {isRunning && (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-[11px] text-text-muted">Please keep this tab open. You can cancel anytime.</p>
              <button
                onClick={handleCancel}
                className="rounded-lg border-2 border-red-primary bg-white px-4 py-2 text-sm font-semibold text-red-primary transition hover:bg-red-primary hover:text-white disabled:opacity-40"
              >
                Cancel Import
              </button>
            </div>
          )}

          {job.status === "done" && (
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={handleReset} className="rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-gold-primary hover:text-gold-primary">
                Import More
              </button>
              <button onClick={() => router.push("/admin-panel/products")} className="rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury">
                View Products
              </button>
            </div>
          )}

          {(job.status === "error" || job.status === "cancelled") && (
            <div className="mt-5 flex justify-end">
              <button onClick={handleReset} className="rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury">
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recently Imported Section */}
      <div className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark md:p-6">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Recently Imported (Last 24 Hours)
        </h2>
        
        {loadingRecent ? (
          <div className="flex justify-center py-4">
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
          </div>
        ) : recentImports.length === 0 ? (
          <p className="text-sm text-text-muted">No products imported in the last 24 hours.</p>
        ) : (
          <div className="space-y-2">
            {recentImports.map((p) => (
              <div key={p.id} className="rounded-lg border border-border-subtle bg-bg-input">
                <button
                  onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                  className="flex w-full items-center justify-between p-3 text-left transition hover:bg-bg-orange"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white">
                      {p.image ? (
                        <img src={p.image} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs">📦</span>
                      )}
                    </div>
                    <div>
                      <p className="line-clamp-1 text-sm font-semibold text-text-primary">{p.title}</p>
                      <p className="text-xs text-text-muted">
                        {formatBDT(p.price)} • {p.colors?.length || 0} colors • {p.sizes?.length || 0} sizes
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gold-primary">
                    {expandedProduct === p.id ? "Hide" : "Show"}
                  </span>
                </button>
                
                {expandedProduct === p.id && (
                  <div className="border-t border-border-subtle p-3 bg-white">
                    <p className="text-xs text-text-secondary mb-2"><strong>ID:</strong> {p.id}</p>
                    <p className="text-xs text-text-secondary mb-2"><strong>Supplier:</strong> {p.supplierName}</p>
                    <p className="text-xs text-text-secondary mb-2"><strong>Category:</strong> {p.categoryId} / {p.subcategoryId}</p>
                    
                    {p.colors && p.colors.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-bold uppercase text-text-muted">Colors:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.colors.map((c: any) => (
                            <span key={c.id} className="text-[10px] border border-border-subtle px-1.5 py-0.5 rounded bg-bg-input">
                              {c.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}