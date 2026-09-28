"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=90&auto=format&fit=crop",
    badge: "New Arrivals",
    title: "Timeless Style",
    subtitle: "From China",
    tagline: "Premium smart watches, crafted for everyday elegance",
    cta: "Explore Watches",
    href: "/categories/mobile",
  },
  {
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=90&auto=format&fit=crop",
    badge: "Sound Redefined",
    title: "Where Quality",
    subtitle: "Meets Value",
    tagline: "Crystal-clear audio. Wireless freedom. Unbeatable prices.",
    cta: "Shop Audio",
    href: "/categories/mobile",
  },
  {
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=90&auto=format&fit=crop",
    badge: "Trending Now",
    title: "Walk Bold,",
    subtitle: "Step Confident",
    tagline: "Discover footwear that turns every step into a statement",
    cta: "Browse Footwear",
    href: "/categories/shoes",
  },
  {
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=90&auto=format&fit=crop",
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
    <section className="bg-bg-secondary px-3 pt-3 md:px-4 md:pt-4">
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="relative overflow-hidden rounded-lg shadow-sm" style={{ background: "linear-gradient(135deg, #FF6600 0%, #FF8534 60%, #E31B16 100%)" }}>
          <div className="relative flex items-center gap-2 px-4 py-6 md:px-10 md:py-12">
            <div className="z-10 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {slide.badge}
              </div>

              <h1 key={`title-${current}`} className="mt-3 font-serif text-[22px] font-bold leading-tight text-white md:text-4xl" style={{ animation: "slideInLeft 1.2s ease-out" }}>
                <span className="block">{slide.title}</span>
                <span className="block">{slide.subtitle}</span>
              </h1>

              <p key={`tag-${current}`} className="mt-1.5 text-[11px] text-white/95 md:mt-3 md:text-sm" style={{ animation: "slideInLeft 1.2s ease-out" }}>
                {slide.tagline}
              </p>

              <Link href={slide.href} className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-gold-primary shadow-lg transition hover:bg-bg-input md:mt-5 md:px-6 md:py-2.5 md:text-sm">
                {slide.cta}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            <div className="relative flex flex-1 items-center justify-center md:flex-[1.2]">
              <div className="relative w-full">
                <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-lg bg-white shadow-2xl md:max-w-[320px]">
                  <img key={`img-${current}`} src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" style={{ animation: "slideInRight 1.2s ease-out" }} />
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center gap-1.5 pb-3 md:pb-4">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all md:h-2 ${i === current ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </section>
  );
}