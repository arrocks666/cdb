"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=90&auto=format&fit=crop",
    badge: "New Arrivals",
    title: "Timeless Style",
    subtitle: "From China",
    tagline: "Premium smart watches, crafted for everyday elegance",
    cta: "Explore Watches",
    href: "/categories/electronics",
  },
  {
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=90&auto=format&fit=crop",
    badge: "Sound Redefined",
    title: "Where Quality",
    subtitle: "Meets Value",
    tagline: "Crystal-clear audio. Wireless freedom. Unbeatable prices.",
    cta: "Shop Audio",
    href: "/categories/electronics",
  },
  {
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=90&auto=format&fit=crop",
    badge: "Trending Now",
    title: "Walk Bold,",
    subtitle: "Step Confident",
    tagline: "Discover footwear that turns every step into a statement",
    cta: "Browse Footwear",
    href: "/categories/mens-fashion",
  },
  {
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=90&auto=format&fit=crop",
    badge: "Exclusive Deals",
    title: "Elegance You",
    subtitle: "Truly Deserve",
    tagline: "Handpicked fashion and beauty essentials, delivered to your door",
    cta: "Discover Fashion",
    href: "/categories/womens-fashion",
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <section className="px-3 pt-3 md:px-4 md:pt-6">
      <div className="mx-auto w-full max-w-[1800px]">
        <div
          className="relative overflow-hidden rounded-2xl border border-gold-primary/40 shadow-card-dark"
          style={{
            background:
              "radial-gradient(140% 140% at 100% 0%, #E31B16 0%, #8E1715 22%, #3a0d0c 55%, #1a0707 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-2/3 select-none opacity-[0.13]"
          >
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[120px] leading-none md:right-10 md:text-[240px]">
              🏯
            </div>
          </div>

          <div className="relative flex items-center gap-2 px-4 py-6 md:px-10 md:py-16">
            <div className="z-10 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-primary/40 bg-black/40 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gold-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-red-primary" />
                {slide.badge}
              </div>

              <h1
                key={`title-${current}`}
                className="mt-3 font-serif text-[22px] font-bold leading-tight md:text-5xl"
                style={{ animation: "slideInLeft 1.2s ease-out" }}
              >
                <span className="block text-text-primary">{slide.title}</span>
                <span className="block gold-text text-shadow-gold">
                  {slide.subtitle}
                </span>
              </h1>

              <p
                key={`tag-${current}`}
                className="mt-1.5 text-[11px] tracking-wide text-text-secondary md:mt-3 md:text-base"
                style={{ animation: "slideInLeft 1.2s ease-out" }}
              >
                {slide.tagline}
              </p>

              <Link
                href={slide.href}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-red-primary px-4 py-2 text-xs font-semibold text-white shadow-red-glow transition hover:bg-red-bright md:mt-6 md:px-6 md:py-3 md:text-sm"
              >
                {slide.cta}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            <div className="relative flex flex-1 items-center justify-center md:flex-[1.2]">
              <div className="relative w-full">
                <div className="absolute inset-0 -z-10 rounded-full bg-red-bright/40 blur-3xl" />
                <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl border border-gold-primary/30 bg-black/30 shadow-[0_20px_40px_rgba(227,27,22,0.5)] md:max-w-[360px]">
                  <img
                    key={`img-${current}`}
                    src={slide.image}
                    alt={slide.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ animation: "slideInRight 1.2s ease-out" }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center gap-1.5 pb-3 md:pb-5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all md:h-2 ${
                  i === current
                    ? "w-8 bg-red-primary"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-60px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(60px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}