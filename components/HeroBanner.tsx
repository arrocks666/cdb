"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllBanners, type Banner } from "@/lib/firestoreBanners";

type Slide = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  textPosition: "left" | "right" | "center";
};

// Default banner shown instantly, before Firestore loads
const DEFAULT_SLIDE: Slide = {
  id: "default",
  image:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=800&q=80&auto=format&fit=crop",
  title: "Walk Bold,\nStep Confident",
  subtitle: "Discover footwear that turns every step into a statement",
  buttonText: "Browse Footwear",
  buttonLink: "/categories/shoes",
  textPosition: "left",
};

export default function HeroBanner() {
  const router = useRouter();
  // Start with default slide — no blank flash
  const [slides, setSlides] = useState<Slide[]>([DEFAULT_SLIDE]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const banners = await getAllBanners();
        if (banners.length > 0) {
          setSlides(
            banners.map((b) => ({
              id: b.id,
              image: b.image,
              title: b.title ?? "",
              subtitle: b.subtitle ?? "",
              buttonText: b.buttonText ?? "",
              buttonLink: b.buttonLink ?? "",
              textPosition: b.textPosition ?? "left",
            }))
          );
        }
        // If no banners in Firestore → keep DEFAULT_SLIDE showing
      } catch {
        // Keep DEFAULT_SLIDE on error
      }
    })();
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];

  const textAlign =
    slide.textPosition === "center"
      ? "text-center items-center"
      : slide.textPosition === "right"
        ? "text-right items-end"
        : "text-left items-start";

  const mdOrder =
    slide.textPosition === "right"
      ? "md:order-2"
      : "md:order-1";

  const imgOrder =
    slide.textPosition === "right"
      ? "md:order-1"
      : "md:order-2";

  return (
    <section className="bg-bg-secondary px-3 py-3 md:px-4 md:py-4">
      <div className="mx-auto w-full max-w-[1800px]">
        <div
          className="relative overflow-hidden rounded-2xl shadow-card-hover"
          style={{
            background:
              "linear-gradient(135deg, #FF6600 0%, #FF8534 55%, #E31B16 100%)",
          }}
        >
          <div
            key={slide.id}
            className="relative grid grid-cols-1 gap-4 p-6 md:grid-cols-2 md:items-center md:gap-6 md:p-8 lg:p-10"
          >
            <div className={`flex flex-col ${textAlign} ${mdOrder}`}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white md:text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                New Arrivals
              </div>

              {slide.title && (
                <h1
                  className="mt-3 whitespace-pre-line font-serif text-2xl font-bold leading-tight text-white md:text-4xl lg:text-5xl animate-[fadeSlideUp_0.7s_ease-out]"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
                >
                  {slide.title}
                </h1>
              )}

              {slide.subtitle && (
                <p
                  className="mt-3 max-w-md text-sm text-white/90 md:text-base animate-[fadeSlideUp_0.9s_ease-out]"
                  style={{ animationDelay: "0.15s", animationFillMode: "both" }}
                >
                  {slide.subtitle}
                </p>
              )}

              {slide.buttonText && (
                <button
                  onClick={() =>
                    slide.buttonLink && router.push(slide.buttonLink)
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gold-primary shadow-lg transition hover:scale-105 hover:bg-bg-orange md:text-base animate-[fadeSlideUp_1.1s_ease-out]"
                  style={{ animationDelay: "0.3s", animationFillMode: "both" }}
                >
                  {slide.buttonText}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </div>

            {slide.image && (
              <div
                className={`relative overflow-hidden rounded-xl shadow-2xl ${imgOrder} animate-[fadeSlideRight_0.8s_ease-out]`}
              >
                <img
                  src={slide.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover md:aspect-[5/4]"
                />
              </div>
            )}
          </div>

          {slides.length > 1 && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrent(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeSlideRight {
          from {
            opacity: 0;
            transform: translateX(24px);
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