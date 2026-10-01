"use client";

export default function ProductSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border-subtle bg-white shadow-sm">
      <div
        className="relative aspect-square m-2 animate-pulse rounded-md"
        style={{ backgroundColor: "#F0F0F0" }}
      >
        <div className="absolute left-2 top-2 h-4 w-10 animate-pulse rounded bg-white/70" />
      </div>

      <div className="p-2.5 md:p-3">
        <div className="h-3 w-full animate-pulse rounded bg-bg-input" />
        <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-bg-input" />

        <div className="mt-1 flex items-center gap-1">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-bg-input" />
          <div className="h-2.5 w-12 animate-pulse rounded bg-bg-input" />
        </div>

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <div className="h-4 w-20 animate-pulse rounded bg-bg-input md:h-5 md:w-24" />
        </div>
      </div>

      <div className="px-2.5 pb-2.5 md:px-3 md:pb-3">
        <div className="h-8 w-full animate-pulse rounded-lg bg-bg-input" />
      </div>
    </div>
  );
}