"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { products } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import LiveProductCard from "@/components/LiveProductCard";
import { LiveProduct } from "@/lib/live-search";

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm">
      <div className="relative aspect-square m-2 overflow-hidden rounded-md bg-bg-input">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>
      <div className="p-2.5 md:p-3">
        <div className="relative h-3 w-full overflow-hidden rounded bg-bg-input">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
        <div className="relative mt-1.5 h-3 w-3/4 overflow-hidden rounded bg-bg-input">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
        <div className="relative mt-2 h-2.5 w-1/2 overflow-hidden rounded bg-bg-input">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
        <div className="relative mt-2 h-4 w-2/5 overflow-hidden rounded bg-bg-input">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      </div>
      <div className="px-2.5 pb-2.5 md:px-3 md:pb-3">
        <div className="relative h-8 w-full overflow-hidden rounded-lg bg-bg-input">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      </div>
    </div>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const isImageSearch = searchParams.get("image") === "true";

  const [query, setQuery] = useState(urlQuery);
  const [submittedQuery, setSubmittedQuery] = useState(urlQuery);
  const [liveProducts, setLiveProducts] = useState<LiveProduct[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const searchIdRef = useRef(0);

  // Image search results
  const [imageResults, setImageResults] = useState<LiveProduct[]>([]);

  // Load image search results from sessionStorage
  useEffect(() => {
    if (isImageSearch) {
      try {
        const raw = sessionStorage.getItem("image_search_results");
        if (raw) {
          const parsed = JSON.parse(raw) as LiveProduct[];
          setImageResults(parsed.slice(0, 5)); // ensure max 5
        }
      } catch (err) {
        console.error("Failed to load image results:", err);
      }
    }
  }, [isImageSearch]);

  // Sync input when URL changes externally
  useEffect(() => {
    setQuery(urlQuery);
    setSubmittedQuery(urlQuery);
  }, [urlQuery]);

  // Local filtered results
  const localResults = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }, [submittedQuery]);

  // Live search on submit (skip if this is image search)
  useEffect(() => {
    if (isImageSearch) return;

    const q = submittedQuery.trim();

    if (q.length < 2) {
      setLiveProducts([]);
      setLoadingLive(false);
      return;
    }

    // If we have 3+ local results, don't hit Apify
    if (localResults.length >= 3) {
      setLiveProducts([]);
      setLoadingLive(false);
      return;
    }

    const myId = ++searchIdRef.current;
    setLoadingLive(true);
    setLiveProducts([]);

    (async () => {
      try {
        const res = await fetch(`/api/live-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (myId !== searchIdRef.current) return;
        setLiveProducts((data.products ?? []).slice(0, 5));
      } catch (err) {
        console.error("Live search failed:", err);
        if (myId === searchIdRef.current) setLiveProducts([]);
      } finally {
        if (myId === searchIdRef.current) setLoadingLive(false);
      }
    })();
  }, [submittedQuery, localResults.length, isImageSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    router.replace(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  const hasLocalResults = localResults.length > 0;
  const hasLiveResults = liveProducts.length > 0;
  const hasImageResults = imageResults.length > 0;
  const hasSubmitted = submittedQuery.trim().length >= 2;

  const showHitSearchHint =
    !isImageSearch &&
    query.trim().length >= 2 &&
    query.trim().toLowerCase() !== submittedQuery.trim().toLowerCase();

  const isEmpty =
    hasSubmitted &&
    !hasLocalResults &&
    !hasLiveResults &&
    !loadingLive &&
    !isImageSearch;

  const totalCount = localResults.length + liveProducts.length;

  return (
    <div className="min-h-screen bg-bg-secondary">
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes liveDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Search bar */}
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
        {/* IMAGE SEARCH RESULTS */}
        {isImageSearch && (
          <>
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-gold-primary/30 bg-bg-orange px-4 py-3">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold-primary">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm font-semibold text-text-primary md:text-base">
                  Image Search Results
                </span>
              </div>
              <button
                onClick={() => {
                  sessionStorage.removeItem("image_search_results");
                  router.replace("/search", { scroll: false });
                }}
                className="text-xs font-semibold text-gold-primary underline"
              >
                Clear
              </button>
            </div>

            {hasImageResults ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
                {imageResults.map((p) => (
                  <LiveProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="mt-16 flex flex-col items-center text-center">
                <div className="text-6xl opacity-40">📷</div>
                <h3 className="mt-4 text-lg font-bold text-text-primary">
                  No matches found
                </h3>
                <p className="mt-1 max-w-xs text-xs text-text-muted">
                  Try a clearer photo with the product centered
                </p>
              </div>
            )}
          </>
        )}

        {/* LIVE SEARCH HINT */}
        {!isImageSearch && showHitSearchHint && !loadingLive && (
          <div className="mb-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-white py-8 text-center">
            <div className="text-4xl opacity-60">🔍</div>
            <p className="mt-3 text-sm font-medium text-text-primary md:text-base">
              Press <span className="font-bold text-gold-primary">Search</span> to find "{query}"
            </p>
            <p className="mt-1 text-xs text-text-muted md:text-sm">
              We'll look through thousands of products
            </p>
          </div>
        )}

        {/* LIVE SEARCH LOADING */}
        {!isImageSearch && loadingLive && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gold-primary" style={{ animation: "liveDot 1.4s infinite ease-in-out" }} />
              <span className="h-2 w-2 rounded-full bg-gold-primary" style={{ animation: "liveDot 1.4s infinite ease-in-out", animationDelay: "0.2s" }} />
              <span className="h-2 w-2 rounded-full bg-gold-primary" style={{ animation: "liveDot 1.4s infinite ease-in-out", animationDelay: "0.4s" }} />
            </div>
            <span className="text-xs font-medium text-text-secondary md:text-sm">
              Finding products...
            </span>
          </div>
        )}

        {/* RESULTS COUNT */}
        {!isImageSearch && hasSubmitted && !loadingLive && totalCount > 0 && (
          <p className="mb-3 text-xs text-text-secondary md:text-sm">
            Showing <span className="font-bold text-gold-primary">{totalCount}</span>{" "}
            {totalCount === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-text-primary">"{submittedQuery}"</span>
          </p>
        )}

        {/* LOCAL RESULTS */}
        {!isImageSearch && hasLocalResults && (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5">
            {localResults.map((p) => (
              <ProductCard key={`${p.id}-${p.image}`} product={p} />
            ))}
          </div>
        )}

        {/* LIVE RESULTS + 5 SKELETONS */}
        {!isImageSearch && hasSubmitted && (
          <>
            {loadingLive && liveProducts.length === 0 && (
              <div className={hasLocalResults ? "mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5" : "grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5"}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {hasLiveResults && (
              <div className={hasLocalResults ? "mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5" : "grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 lg:grid-cols-5"}>
                {liveProducts.map((p) => (
                  <LiveProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </>
        )}

        {/* EMPTY */}
        {isEmpty && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="text-6xl opacity-40">🔍</div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">
              No results found
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              We couldn't find anything for "{submittedQuery}". Try a different keyword.
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

        {/* INITIAL */}
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
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading…</div>}>
      <SearchContent />
    </Suspense>
  );
}