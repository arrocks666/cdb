"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import { formatBDT } from "@/lib/data";
import { useProducts } from "@/lib/ProductsContext";
import {
  loadSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/firestoreSettings";
import ImageSearchModal from "./ImageSearchModal";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const { products } = useProducts();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showSearchBar = pathname !== "/search";

  // ✅ Reload settings on every pathname change → picks up fresh logo
  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, [pathname]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [query, products]);

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
    setOpen(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const goToProduct = (id: string) => {
    setQuery("");
    setOpen(false);
    router.push(`/product/${id}`);
  };

  const goToSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const logoUrl = settings.logoUrl;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white shadow-sm">
        <div className="relative mx-auto flex max-w-[1800px] items-center justify-between gap-2 px-3 py-2.5 md:gap-3 md:px-4 md:py-3">
          <div className="flex flex-shrink-0 items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-1 rounded-md border border-gold-primary/40 bg-bg-orange px-2 py-1 md:gap-1.5 md:px-2.5 md:py-1.5">
              <span className="text-sm md:text-base">🇨🇳</span>
              <span className="text-[8px] font-bold text-gold-primary md:text-[10px]">
                →
              </span>
              <span className="text-sm md:text-base">🇧🇩</span>
            </div>

            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="logo"
                  className="h-8 w-8 flex-shrink-0 rounded-md object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gold-primary text-base font-bold text-white shadow-orange-glow">
                  买
                </div>
              )}
              <div className="hidden font-serif text-lg font-bold leading-none sm:block md:text-xl">
                <span className="text-text-primary">ChinaDaily</span>
                <span className="text-gold-primary">Bazar</span>
              </div>
            </button>
          </div>

          <button
            onClick={() => router.push("/")}
            className="absolute left-[53%] top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-lg font-bold leading-none sm:hidden"
          >
            <span className="text-text-primary">ChinaDaily</span>
            <span className="text-gold-primary">Bazar</span>
          </button>

          <nav className="ml-auto hidden items-center gap-6 text-sm font-medium md:flex">
            <button
              onClick={() => router.push("/")}
              className="text-text-primary transition hover:text-gold-primary"
            >
              Home
            </button>
            <button
              onClick={() => router.push("/categories")}
              className="text-text-secondary transition hover:text-gold-primary"
            >
              Categories
            </button>
            <button
              onClick={() => router.push("/search")}
              className="text-text-secondary transition hover:text-gold-primary"
            >
              Search
            </button>
            <button
              onClick={() => router.push("/account")}
              className="text-text-secondary transition hover:text-gold-primary"
            >
              Account
            </button>
          </nav>

          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              aria-label="Wishlist"
              onClick={() => router.push("/wishlist")}
              className="hidden h-9 w-9 items-center justify-center text-text-secondary transition hover:text-gold-primary md:flex"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            <button
              aria-label="Cart"
              onClick={() => router.push("/cart")}
              className="relative flex h-9 w-9 items-center justify-center text-gold-primary transition hover:text-gold-luxury"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
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
          <div className="bg-white px-3 pb-2.5 md:px-4 md:pb-3" ref={wrapperRef}>
            <form
              onSubmit={handleSubmit}
              className="relative mx-auto max-w-[1800px]"
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-text-muted md:left-4">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="md:h-[18px] md:w-[18px]"
                  >
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
                  placeholder="Search products..."
                  className="w-full rounded-full border border-border-subtle bg-bg-input py-2 pl-10 pr-11 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none md:py-2.5 md:pl-11 md:pr-12"
                />

                <button
                  type="button"
                  aria-label="Search by image"
                  onClick={() => {
                    setOpen(false);
                    setImageModalOpen(true);
                  }}
                  className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-gold-primary transition hover:bg-bg-orange md:right-2 md:h-8 md:w-8"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="md:h-[18px] md:w-[18px]"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>

              {open && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border-subtle bg-white shadow-card-hover">
                  {suggestions.length > 0 ? (
                    <ul className="divide-y divide-border-subtle">
                      {suggestions.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => goToProduct(p.id)}
                            className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-bg-input"
                          >
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-contain"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
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
                      <li className="border-t border-border-subtle">
                        <button
                          type="button"
                          onClick={goToSearch}
                          className="flex w-full items-center justify-center gap-2 p-3 text-center text-xs font-semibold text-gold-primary transition hover:bg-bg-input"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          Search all products for "{query}" →
                        </button>
                      </li>
                    </ul>
                  ) : (
                    <button
                      type="button"
                      onClick={goToSearch}
                      className="flex w-full items-center justify-center gap-2 p-4 text-center text-sm font-semibold text-gold-primary transition hover:bg-bg-input"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Search for "{query}" →
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </header>

      <ImageSearchModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onJobStarted={(jobId) => {
          router.push(`/search?image=true&jobId=${encodeURIComponent(jobId)}`);
        }}
      />
    </>
  );
}