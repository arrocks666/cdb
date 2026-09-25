"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { products } from "@/lib/data";
import ProductCard from "@/components/ProductCard";

const tabs = ["All", "Products", "Shops"];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      const newUrl = trimmed
        ? `/search?q=${encodeURIComponent(trimmed)}`
        : "/search";
      router.replace(newUrl, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, router]);

  return (
    <div>
      {/* Top bar — sticks directly under the global header */}
      <div
        className="sticky top-[52px] z-40 border-b border-border-subtle shadow-lg md:top-[56px]"
        style={{ backgroundColor: "#080808" }}
      >
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

          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-primary">
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
              className="w-full rounded-full border border-gold-primary/60 bg-bg-input py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
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
        </div>

        <div className="mx-auto flex max-w-[1800px] gap-5 px-4 pb-2">
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-2 text-sm font-medium transition ${
                  active ? "text-red-primary" : "text-text-muted hover:text-gold-primary"
                }`}
              >
                {tab}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-red-primary shadow-red-glow" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-3 md:px-4 md:py-5">
        {query.trim() ? (
          <p className="text-xs text-text-secondary md:text-sm">
            Showing <span className="text-gold-primary">{results.length}</span>{" "}
            {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-red-primary">"{query}"</span>
          </p>
        ) : (
          <p className="text-xs text-text-secondary md:text-sm">
            Type something to search...
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-full border border-gold-primary/60 bg-bg-card px-3 py-1.5 text-xs font-medium text-gold-primary transition hover:border-gold-primary hover:bg-bg-card-elevated">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-gold-primary/60 bg-bg-card px-3 py-1.5 text-xs font-medium text-gold-primary transition hover:border-gold-primary hover:bg-bg-card-elevated">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="9" y1="18" x2="15" y2="18" />
            </svg>
            Sort
          </button>
          <div className="ml-auto flex rounded-full border border-gold-primary/40 bg-bg-card p-0.5">
            <button className="rounded-full bg-red-primary px-2 py-1 text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button className="rounded-full px-2 py-1 text-gold-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
            {results.map((p) => (
              <ProductCard key={`${p.id}-${p.image}`} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="text-6xl opacity-60">🔍</div>
            <h3 className="mt-4 font-serif text-lg font-bold">
              <span className="gold-text">No results found</span>
            </h3>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              We couldn't find anything for{" "}
              <span className="text-red-primary">"{query}"</span>.
            </p>
            <button
              onClick={() => setQuery("")}
              className="mt-5 rounded-full bg-red-primary px-5 py-2 text-xs font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
            >
              Clear Search
            </button>
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