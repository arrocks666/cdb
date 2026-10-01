"use client";

import { useState } from "react";
import type { ProductColor } from "@/lib/ProductsContext";

type Props = {
  open: boolean;
  colors: ProductColor[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  title?: string;
};

export default function ColorPickerModal({
  open,
  colors,
  selectedId,
  onSelect,
  onClose,
  title = "Choose a Color",
}: Props) {
  const [search, setSearch] = useState("");

  if (!open) return null;

  const filtered = search.trim()
    ? colors.filter((c) =>
        c.label.toLowerCase().includes(search.trim().toLowerCase())
      )
    : colors;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-text-primary md:text-lg">
              {title}
            </h2>
            <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
              {colors.length} option{colors.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition hover:bg-bg-input hover:text-red-primary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {colors.length > 8 && (
          <div className="border-b border-border-subtle px-4 py-2.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search colors..."
                className="w-full rounded-lg border border-border-subtle bg-bg-input py-2 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-primary"
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">
              No colors match "{search}"
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id);
                      onClose();
                    }}
                    className={`flex flex-col items-center gap-1.5 overflow-hidden rounded-lg border-2 bg-white p-2 transition ${
                      active
                        ? "border-gold-primary shadow-orange-glow"
                        : "border-border-subtle hover:border-gold-primary/60"
                    }`}
                  >
                    {c.image ? (
                      <img
                        src={c.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-14 w-14 rounded object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span
                        className="h-10 w-10 rounded-full border border-black/10"
                        style={{ backgroundColor: c.hex }}
                      />
                    )}
                    <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-text-primary md:text-xs">
                      {c.label}
                    </span>
                    {active && (
                      <span className="text-[9px] font-bold text-gold-primary">
                        ✓ Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-border-subtle bg-white py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-bg-input md:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}