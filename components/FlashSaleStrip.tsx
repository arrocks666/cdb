"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProducts, Product } from "@/lib/ProductsContext";
import { formatBDT } from "@/lib/data";

export default function FlashSaleStrip() {
  const { products } = useProducts();
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

  // Flash sale products — admin-flagged first, fall back to top-rated
  const flashFlagged = products.filter((p) => p.isFlashSale);
  const fallback = [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const flashProducts = (flashFlagged.length > 0 ? flashFlagged : fallback).slice(0, 4);

  return (
    <section className="bg-white px-3 py-3 md:px-4 md:py-4">
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm">
          <div className="relative flex items-center justify-between px-3 py-2.5 md:px-5 md:py-3.5" style={{ background: "linear-gradient(90deg, #FF6600 0%, #FF8534 100%)" }}>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-lg md:text-2xl">⚡</span>
              <div>
                <h2 className="text-sm font-bold leading-none text-white md:text-base">Flash Sale</h2>
                <p className="mt-0.5 text-[9px] font-medium text-white/90 md:text-[11px]">Limited Time</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 md:gap-1">
              <TimePill value={pad(time.h)} />
              <span className="text-xs font-bold text-white md:text-base">:</span>
              <TimePill value={pad(time.m)} />
              <span className="text-xs font-bold text-white md:text-base">:</span>
              <TimePill value={pad(time.s)} />
            </div>
            <Link href="/search" className="flex items-center gap-0.5 text-[10px] font-semibold text-white transition hover:text-white/80 md:text-xs">
              See All →
            </Link>
          </div>

          <div className="bg-white p-2.5 md:p-3">
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
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

function FlashProduct({ product }: { product: Product }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = product.image && !imgFailed;

  return (
    <Link href={`/product/${product.id}`} className="group overflow-hidden rounded-lg border border-border-subtle bg-white transition hover:border-gold-primary hover:shadow-md">
      <div className="relative aspect-square flex items-center justify-center overflow-hidden rounded-md m-2" style={{ backgroundColor: "#F9F9F9" }}>
        {showImage ? (
          <img src={product.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2" onError={() => setImgFailed(true)} />
        ) : (
          <span className="text-4xl md:text-5xl">📦</span>
        )}
        {product.discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-red-primary px-1.5 py-0.5 text-[10px] font-bold text-white">-{product.discount}%</span>
        )}
      </div>
      <div className="p-2 md:p-2.5">
        <h3 className="text-[12px] font-medium text-text-primary line-clamp-1 md:text-[13px]">{product.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-[10px] md:text-[11px]">
          <span className="text-gold-primary">★</span>
          <span className="text-text-secondary">{(product.rating ?? 4.5).toFixed(1)}</span>
          <span className="text-text-muted">({product.reviews ?? 0})</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-sm font-bold text-red-primary md:text-base">{formatBDT(product.price)}</span>
          {product.oldPrice > product.price && (
            <span className="text-[10px] text-text-muted line-through md:text-[11px]">{formatBDT(product.oldPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function TimePill({ value }: { value: string }) {
  return (
    <span className="rounded bg-black/30 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white md:px-2 md:text-sm">{value}</span>
  );
}