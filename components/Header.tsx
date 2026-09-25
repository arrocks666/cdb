"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import { products, formatBDT } from "@/lib/data";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showSearchBar = pathname !== "/search";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  };

  const goToProduct = (id: string) => {
    setQuery("");
    setOpen(false);
    router.push(`/product/${id}`);
  };

  return (
    <header
      className="sticky top-0 z-50 border-b border-border-subtle shadow-lg"
      style={{ backgroundColor: "#080808" }}
    >
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 pt-3 pb-2">
        <button
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center text-text-primary transition hover:text-gold-primary"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>

        <button
          onClick={() => router.push("/")}
          className="flex flex-1 items-center justify-center gap-2 md:flex-none md:justify-start"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-primary text-base font-bold text-gold-light shadow-red-glow">
            福
          </div>
          <div className="font-serif text-lg font-bold leading-none md:text-xl">
            <span className="gold-text">ChinaDaily</span>
            <span className="text-red-primary">Bazar</span>
          </div>
        </button>

        <nav className="hidden items-center gap-6 pl-8 text-sm font-medium md:flex">
          <button onClick={() => router.push("/")} className="text-text-primary transition hover:text-gold-primary">Home</button>
          <button onClick={() => router.push("/categories")} className="text-text-secondary transition hover:text-gold-primary">Categories</button>
          <button onClick={() => router.push("/search")} className="text-text-secondary transition hover:text-gold-primary">Search</button>
          <button onClick={() => router.push("/account")} className="text-text-secondary transition hover:text-gold-primary">Account</button>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Wishlist"
            onClick={() => router.push("/wishlist")}
            className="hidden h-9 w-9 items-center justify-center text-text-secondary transition hover:text-gold-primary md:flex"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button
            aria-label="Cart"
            onClick={() => router.push("/cart")}
            className="relative flex h-9 w-9 items-center justify-center text-gold-primary transition hover:text-gold-luxury"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cart.totalCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-primary px-1 text-[10px] font-bold text-white shadow-red-glow">
                {cart.totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showSearchBar && (
        <div className="px-4 pb-3" ref={wrapperRef} style={{ backgroundColor: "#080808" }}>
          <form
            onSubmit={handleSubmit}
            className="relative mx-auto max-w-[1800px]"
          >
            <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gold-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search products, categories..."
              className="w-full rounded-full border border-border-gold bg-bg-input py-2.5 pl-11 pr-24 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary/70 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-red-primary px-4 py-1.5 text-xs font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
            >
              Search
            </button>

            {open && query.trim() && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-gold-primary/40 bg-bg-card shadow-card-dark">
                {results.length === 0 ? (
                  <div className="p-4 text-center text-xs text-text-muted">
                    No products found for "{query}"
                  </div>
                ) : (
                  <ul className="divide-y divide-border-subtle">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => goToProduct(p.id)}
                          className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-bg-card-elevated"
                        >
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold-primary/40 bg-bg-card-elevated">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt=""
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="text-xl">📦</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {p.title}
                            </p>
                            <p className="mt-0.5 text-xs font-bold text-red-primary">
                              {formatBDT(p.price)}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                    <li className="border-t border-gold-primary/40">
                      <button
                        type="button"
                        onClick={() => {
                          router.push(`/search?q=${encodeURIComponent(query)}`);
                          setOpen(false);
                        }}
                        className="w-full p-3 text-center text-xs font-semibold text-gold-primary transition hover:bg-bg-card-elevated"
                      >
                        See all results for "{query}" →
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </header>
  );
}