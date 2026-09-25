"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { products, formatBDT } from "@/lib/data";

export default function FlashSaleStrip() {
  const [time, setTime] = useState({ h: 2, m: 45, s: 30 });

  useEffect(() => {
    const id = setInterval(() => {
      setTime((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const flashProducts = [...products]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  return (
    <section className="px-3 py-3 md:px-4 md:py-6">
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="overflow-hidden rounded-2xl border border-red-dark/50 shadow-card-dark">
          <div
            className="relative flex items-center justify-between px-3 py-2.5 md:px-5 md:py-3.5"
            style={{
              background: "linear-gradient(90deg, #8E1715 0%, #E31B16 50%, #B51F1A 100%)",
            }}
          >
            <div aria-hidden className="pointer-events-none absolute left-1 top-1 text-[8px] text-gold-primary/70">◆</div>
            <div aria-hidden className="pointer-events-none absolute right-1 top-1 text-[8px] text-gold-primary/70">◆</div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-lg md:text-2xl">⚡</span>
              <div>
                <h2 className="font-serif text-sm font-bold leading-none text-white md:text-lg">
                  Flash Sale
                </h2>
                <p className="mt-0.5 text-[9px] font-medium text-white/80 md:text-[11px]">
                  Limited Time
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 md:gap-1">
              <TimePill value={pad(time.h)} />
              <span className="text-xs font-bold text-white/70 md:text-base">:</span>
              <TimePill value={pad(time.m)} />
              <span className="text-xs font-bold text-white/70 md:text-base">:</span>
              <TimePill value={pad(time.s)} />
            </div>

            <Link
              href="/search"
              className="flex items-center gap-0.5 text-[10px] font-semibold text-white transition hover:text-gold-light md:text-xs"
            >
              See All
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="bg-bg-card p-2.5 md:p-4">
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
              {flashProducts.map((p) => (
                <FlashProduct key={`${p.id}-${p.image}`} product={p} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlashProduct({ product }: { product: any }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = product.image && !imgFailed;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group overflow-hidden rounded-xl border border-gold-primary/40 bg-bg-card-elevated shadow-card-dark transition hover:border-gold-primary"
    >
      <div className="relative aspect-square bg-gradient-to-br from-red-dark/20 to-bg-card flex items-center justify-center overflow-hidden">
        {showImage ? (
          <img
            src={product.image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain p-2"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-4xl md:text-5xl">📦</span>
        )}
        {product.discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-red-primary px-1.5 py-0.5 text-[10px] font-bold text-white shadow-red-glow">
            -{product.discount}%
          </span>
        )}
      </div>

      <div className="p-2 md:p-3">
        <h3 className="text-[12px] font-semibold text-text-primary line-clamp-1 md:text-sm">
          {product.title}
        </h3>
        {product.subtitle && (
          <p className="mt-0.5 text-[10px] text-text-muted line-clamp-1 md:text-[11px]">
            {product.subtitle}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[10px] md:text-[11px]">
          <span className="text-gold-primary">★</span>
          <span className="text-text-secondary">{product.rating.toFixed(1)}</span>
          <span className="text-text-muted">({product.reviews})</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-red-primary md:text-base">
              {formatBDT(product.price)}
            </span>
            {product.oldPrice > product.price && (
              <span className="text-[10px] text-text-muted line-through md:text-[11px]">
                {formatBDT(product.oldPrice)}
              </span>
            )}
          </div>
          <button
            aria-label="Add to cart"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-gold-primary text-gold-primary transition hover:border-red-primary hover:bg-red-primary hover:text-white md:h-7 md:w-7"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
}

function TimePill({ value }: { value: string }) {
  return (
    <span className="rounded bg-red-dark px-1.5 py-0.5 text-xs font-bold tabular-nums text-white shadow-inner md:px-2 md:text-sm">
      {value}
    </span>
  );
}