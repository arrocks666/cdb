"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProducts } from "@/lib/ProductsContext";
import ProductCard from "@/components/ProductCard";
import LiveProductCard from "@/components/LiveProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import { categories } from "@/lib/categories";
import { LiveProduct } from "@/lib/liveProduct";

const SKELETON_SLOTS = 3;
const MAX_404_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const isImageSearch = searchParams.get("image") === "true";
  const jobId = searchParams.get("jobId") ?? "";

  const { products } = useProducts();

  const [query, setQuery] = useState(urlQuery);
  const [submittedQuery, setSubmittedQuery] = useState(urlQuery);
  const [imageResults, setImageResults] = useState<LiveProduct[]>([]);
  const [totalExpected, setTotalExpected] = useState<number>(SKELETON_SLOTS);
  const [jobStatus, setJobStatus] = useState<
    "idle" | "searching" | "loading" | "done" | "error"
  >("idle");
  const [jobError, setJobError] = useState<string | null>(null);
  const [needsCategoryPick, setNeedsCategoryPick] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ✅ Track 404 retries — job may be on a different serverless instance
  const notFoundCountRef = useRef(0);

  useEffect(() => {
    setQuery(urlQuery);
    setSubmittedQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (!isImageSearch || !jobId) return;

    setJobStatus("searching");
    setJobError(null);
    setImageResults([]);
    setTotalExpected(SKELETON_SLOTS);
    notFoundCountRef.current = 0;

    let stopped = false;

    const stopPolling = () => {
      stopped = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/image-search/status?jobId=${jobId}`);

        // ✅ 404 — job may be on a different serverless instance.
        // Retry a few times before giving up.
        if (res.status === 404) {
          notFoundCountRef.current += 1;
          if (notFoundCountRef.current <= MAX_404_RETRIES) {
            console.log(
              `[search] job not found yet (${notFoundCountRef.current}/${MAX_404_RETRIES}), retrying...`
            );
            return;
          }
          stopPolling();
          setJobStatus("error");
          setJobError(
            "আপনার দেওয়া ছবির সাথে কোনো প্রোডাক্টের মিল পাওয়া যাচ্ছে না। অনুগ্রহ করে Alibaba থেকে প্রোডাক্টের ছবি নিয়ে আবার সার্চ করুন।"
          );
          return;
        }

        // Reset retry counter if we got any successful response
        notFoundCountRef.current = 0;

        if (!res.ok) return;

        const data = await res.json();
        const incoming: LiveProduct[] = data.products ?? [];

        if (incoming.length > 0) setImageResults(incoming);
        if (data.totalExpected && data.totalExpected > 0) {
          setTotalExpected(data.totalExpected);
        }

        if (data.status === "searching") {
          setJobStatus("searching");
        } else if (data.status === "loading") {
          setJobStatus("loading");
        } else if (data.status === "done") {
          stopPolling();
          setJobStatus("done");
          if (incoming.length === 0) {
            setJobError(
              "আপনার দেওয়া ছবির সাথে কোনো প্রোডাক্টের মিল পাওয়া যাচ্ছে না। অনুগ্রহ করে Alibaba থেকে প্রোডাক্টের ছবি নিয়ে আবার সার্চ করুন।"
            );
          }
        } else if (data.status === "error") {
          stopPolling();
          setJobStatus("error");
          setJobError(
            data.error ||
              "আপনার দেওয়া ছবির সাথে কোনো প্রোডাক্টের মিল পাওয়া যাচ্ছে না। অনুগ্রহ করে Alibaba থেকে প্রোডাক্টের ছবি নিয়ে আবার সার্চ করুন।"
          );
        }
      } catch (err) {
        console.warn("Poll error:", err);
      }
    };

    poll();
    pollRef.current = setInterval(poll, RETRY_DELAY_MS);

    return () => {
      stopped = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isImageSearch, jobId]);

  const localResults = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }, [submittedQuery, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  const handleClearImageSearch = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    router.replace("/search", { scroll: false });
  };

  const hasLocalResults = localResults.length > 0;
  const hasImageResults = imageResults.length > 0;
  const hasSubmitted = submittedQuery.trim().length >= 2;
  const isSearching = jobStatus === "searching" || jobStatus === "loading";

  const showHitSearchHint =
    !isImageSearch &&
    query.trim().length >= 2 &&
    query.trim().toLowerCase() !== submittedQuery.trim().toLowerCase();

  const isEmpty = !isImageSearch && hasSubmitted && !hasLocalResults;

  const skeletonCount = Math.max(
    0,
    Math.min(SKELETON_SLOTS, totalExpected) - imageResults.length
  );

  return (
    <div className="min-h-screen bg-bg-secondary">
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-3 py-3 md:px-4">
          <Link
            href="/"
            aria-label="Back"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <form onSubmit={handleSubmit} className="relative flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                autoFocus
                className="w-full rounded-full border border-border-subtle bg-bg-input py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSubmittedQuery("");
                    router.replace("/search", { scroll: false });
                  }}
                  aria-label="Clear"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-red-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="flex-shrink-0 rounded-full bg-gold-primary px-4 py-2.5 text-xs font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury md:px-5 md:text-sm"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-3 md:px-4 md:py-5">
        {isImageSearch && (
          <>
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-gold-primary/30 bg-bg-orange px-4 py-3">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold-primary">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm font-semibold text-text-primary md:text-base">
                  {isSearching && imageResults.length === 0
                    ? "Searching for the best match..."
                    : hasImageResults
                    ? `Image Search Results (${imageResults.length}${
                        totalExpected > 0 ? `/${totalExpected}` : ""
                      })`
                    : "Image Search"}
                </span>
                {isSearching && imageResults.length > 0 && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
                )}
              </div>
              <button
                onClick={handleClearImageSearch}
                className="text-xs font-semibold text-gold-primary underline"
              >
                Clear
              </button>
            </div>

            {isSearching && (
              <div className="mb-3 text-xs text-text-secondary md:text-sm">
                {imageResults.length === 0 &&
                  "Please be patient, this can take up to 2 minutes."}
                {imageResults.length > 0 &&
                  `✓ ${imageResults.length} found, loading others...`}
              </div>
            )}

            {jobError && !isSearching && (
              <div className="mt-16 flex flex-col items-center text-center">
                <div className="text-6xl opacity-40">📷</div>
                <h3 className="mt-4 max-w-md text-sm font-bold text-text-primary md:text-base">
                  {jobError}
                </h3>
                <button
                  onClick={() => setNeedsCategoryPick(true)}
                  className="mt-5 rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow"
                >
                  Pick a Category
                </button>
              </div>
            )}

            {(hasImageResults || isSearching) && !jobError && (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
                {imageResults.map((p) => (
                  <LiveProductCard key={p.id} product={p} />
                ))}
                {Array.from({ length: skeletonCount }).map((_, i) => (
                  <ProductSkeleton key={`skel-${i}`} />
                ))}
              </div>
            )}
          </>
        )}

        {!isImageSearch && showHitSearchHint && (
          <div className="mb-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-white py-8 text-center">
            <div className="text-4xl opacity-60">🔍</div>
            <p className="mt-3 text-sm font-medium text-text-primary md:text-base">
              Press <span className="font-bold text-gold-primary">Search</span>{" "}
              to find "{query}"
            </p>
          </div>
        )}

        {!isImageSearch && hasSubmitted && (
          <p className="mb-3 text-xs text-text-secondary md:text-sm">
            Showing{" "}
            <span className="font-bold text-gold-primary">
              {localResults.length}
            </span>{" "}
            {localResults.length === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-text-primary">
              "{submittedQuery}"
            </span>
          </p>
        )}

        {!isImageSearch && hasLocalResults && (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
            {localResults.map((p) => (
              <ProductCard key={`${p.id}-${p.image}`} product={p} />
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">🔍</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">
              No products found
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              We don't have "{submittedQuery}" in our store yet. Try a
              different keyword.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setSubmittedQuery("");
                router.replace("/search", { scroll: false });
              }}
              className="mt-5 rounded-full bg-gold-primary px-5 py-2 text-xs font-semibold text-white shadow-orange-glow"
            >
              Clear Search
            </button>
          </div>
        )}

        {!isImageSearch && !hasSubmitted && !showHitSearchHint && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">🔍</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">
              Search anything
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Type at least 2 characters and press Search
            </p>
          </div>
        )}
      </div>

      {needsCategoryPick && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setNeedsCategoryPick(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border-subtle px-4 py-3">
              <h3 className="text-base font-bold text-text-primary">
                What are you looking for?
              </h3>
              <p className="mt-0.5 text-xs text-text-muted">
                Pick a category to see similar items
              </p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setNeedsCategoryPick(false);
                      router.push(`/categories/${cat.id}`);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-border-subtle bg-white p-3 text-left text-xs font-medium text-text-primary transition hover:border-gold-primary hover:bg-bg-orange md:text-sm"
                  >
                    <span className="text-lg">{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border-subtle p-3">
              <button
                onClick={() => setNeedsCategoryPick(false)}
                className="w-full rounded-lg border border-border-subtle bg-white py-2.5 text-xs font-semibold text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-text-muted">Loading…</div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}