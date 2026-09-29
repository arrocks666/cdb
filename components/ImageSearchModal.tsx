"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { LiveProduct } from "@/lib/live-search";

type Props = {
  open: boolean;
  onClose: () => void;
  onResults: (products: LiveProduct[]) => void;
};

type Stage = "idle" | "uploading" | "searching" | "ranking" | "done";

export default function ImageSearchModal({ open, onClose, onResults }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setPreview(null);
    setFile(null);
    setError(null);
    setStage("idle");
  }, []);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(reset, 300);
      return () => clearTimeout(timer);
    }
  }, [open, reset]);

  // Actually cancel the in-flight request
  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStage("idle");
    setError(null);
  }, []);

  const handleClose = () => {
    if (stage === "uploading" || stage === "searching" || stage === "ranking") {
      // Instead of silently refusing, prompt user
      if (!confirm("Cancel image search?")) return;
      cancelSearch();
    }
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setError(null);
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSearch = async () => {
    if (!file) return;

    setError(null);
    setStage("uploading");

    // Create new abort controller for this request
    const controller = new AbortController();
    abortRef.current = controller;

    // Auto-timeout: abort after 90 seconds (Apify can be slow)
    const timeoutId = setTimeout(() => {
      controller.abort();
      setError("Search timed out. Please try again or upload a different photo.");
      setStage("idle");
    }, 90000);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setStage("searching");

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/image-search", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Search failed");
      }

      setStage("ranking");
      await new Promise((r) => setTimeout(r, 800));

      const data = await res.json();

      clearTimeout(timeoutId);
      abortRef.current = null;

      setStage("done");
      onResults(data.products ?? []);
      onClose();
    } catch (err: any) {
      clearTimeout(timeoutId);
      abortRef.current = null;

      if (err.name === "AbortError") {
        // User cancelled — don't show error
        setStage("idle");
        return;
      }

      console.error("Image search failed:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  if (!open) return null;

  const isLoading =
    stage === "uploading" || stage === "searching" || stage === "ranking";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <style jsx>{`
        @keyframes progressSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="text-base font-bold text-text-primary md:text-lg">
            Search by Image
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition hover:bg-bg-input hover:text-red-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />

          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-subtle bg-bg-input py-12 transition hover:border-gold-primary hover:bg-bg-orange"
            >
              <div className="text-4xl">📷</div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary md:text-base">
                  Upload a photo
                </p>
                <p className="mt-1 text-xs text-text-muted md:text-sm">
                  Take a picture or choose from gallery
                </p>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-72 w-full object-contain"
                />
              </div>

              {isLoading && (
                <div className="mt-3 w-full space-y-2">
                  <ProgressStep
                    active={stage === "uploading"}
                    done={stage !== "uploading"}
                    label="Uploading photo"
                  />
                  <ProgressStep
                    active={stage === "searching"}
                    done={stage === "ranking"}
                    label="Searching for the best match"
                  />
                  <ProgressStep
                    active={stage === "ranking"}
                    done={false}
                    label="Finding the best match for you"
                  />
                  <p className="text-center text-[10px] text-text-muted md:text-xs">
                    This can take 30-60 seconds
                  </p>
                </div>
              )}

              {!isLoading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-xs font-semibold text-gold-primary underline transition hover:text-gold-luxury md:text-sm"
                >
                  Choose a different photo
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary md:text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border-subtle px-4 py-3">
          <button
            onClick={isLoading ? cancelSearch : handleClose}
            className="flex-1 rounded-lg border border-border-subtle bg-white py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-bg-input md:text-sm"
          >
            {isLoading ? "Cancel Search" : "Cancel"}
          </button>
          <button
            onClick={handleSearch}
            disabled={!file || isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gold-primary py-2.5 text-xs font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Searching...
              </>
            ) : (
              <>Search Image</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressStep({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          done
            ? "bg-success text-white"
            : active
              ? "bg-gold-primary text-white"
              : "bg-border-subtle text-text-muted"
        }`}
      >
        {done ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : active ? (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
        )}
      </div>
      <div className="flex-1">
        <div
          className={`text-xs font-medium md:text-sm ${
            done
              ? "text-success"
              : active
                ? "text-gold-primary"
                : "text-text-muted"
          }`}
        >
          {label}
        </div>
        {active && (
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-border-subtle">
            <div
              className="h-full bg-gold-primary"
              style={{ animation: "progressSlide 1.5s infinite linear" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}