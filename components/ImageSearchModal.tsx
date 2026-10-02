"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onJobStarted: (jobId: string) => void;
};

type Stage = "idle" | "uploading" | "searching" | "loading" | "started";

const NO_MATCH_MSG =
  "আপনার দেওয়া ছবির সাথে কোনো প্রোডাক্টের মিল পাওয়া যাচ্ছে না। অনুগ্রহ করে Alibaba থেকে প্রোডাক্টের ছবি নিয়ে আবার সার্চ করুন।";

export default function ImageSearchModal({
  open,
  onClose,
  onJobStarted,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setPreview(null);
    setFile(null);
    setError(null);
    setStage("idle");
    setReadyCount(0);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(reset, 300);
      return () => clearTimeout(timer);
    }
  }, [open, reset]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleClose = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    onClose();
  };

  const processFile = (f: File) => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    processFile(f);
    e.target.value = "";
  };

  const handleSearch = async () => {
    if (!file) return;
    setError(null);
    setStage("uploading");
    setReadyCount(0);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/image-search", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Search failed");
      }

      const data = await res.json();
      const jobId = data.jobId;
      if (!jobId) throw new Error("No jobId returned");

      setStage("searching");

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/image-search/status?jobId=${jobId}`
          );
          if (!statusRes.ok) return;
          const status = await statusRes.json();

          const count = status.products?.length ?? 0;
          setReadyCount(count);

          if (status.status === "searching") {
            setStage("searching");
          } else if (status.status === "loading") {
            setStage("loading");
          }

          // ✅ Found results — close and redirect
          if (count >= 1) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setStage("started");
            onJobStarted(jobId);
            onClose();
            return;
          }

          // ✅ Done with 0 results — show Bangla error, keep modal open
          if (status.status === "done" && count === 0) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setError(NO_MATCH_MSG);
            setStage("idle");
            return;
          }

          // ✅ Server error — show Bangla error
          if (status.status === "error") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setError(NO_MATCH_MSG);
            setStage("idle");
          }
        } catch (pollErr) {
          console.warn("Poll error:", pollErr);
        }
      }, 2000);
    } catch (err: any) {
      console.error("Image search failed:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  if (!open) return null;

  const isLoading =
    stage === "uploading" || stage === "searching" || stage === "loading";

  const isUploading = stage === "uploading";
  const isUploadDone =
    stage === "searching" || stage === "loading" || stage === "started";
  const isSearching = stage === "searching";
  const isSearchDone =
    (stage === "loading" || stage === "started") && readyCount > 0;
  const isLoadingDetails = stage === "loading";
  const isDetailsDone = stage === "started";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={isLoading ? undefined : handleClose}
    >
      <style jsx>{`
        @keyframes progressSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
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
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />

          {!preview ? (
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-subtle bg-bg-input py-8 transition hover:border-gold-primary hover:bg-bg-orange"
              >
                <div className="text-4xl">🖼️</div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary md:text-base">
                    Choose from Gallery
                  </p>
                  <p className="mt-1 text-xs text-text-muted md:text-sm">
                    Pick a photo from your device
                  </p>
                </div>
              </button>

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-subtle bg-bg-input py-8 transition hover:border-gold-primary hover:bg-bg-orange"
              >
                <div className="text-4xl">📷</div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary md:text-base">
                    Take a Photo
                  </p>
                  <p className="mt-1 text-xs text-text-muted md:text-sm">
                    Use your camera to capture the product
                  </p>
                </div>
              </button>
            </div>
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
                <div className="mt-4 w-full space-y-3">
                  <ProgressStep
                    active={isUploading}
                    done={isUploadDone}
                    label="Uploading photo"
                  />
                  <ProgressStep
                    active={isSearching}
                    done={isSearchDone}
                    label="Searching the best match"
                  />
                  <ProgressStep
                    active={isLoadingDetails}
                    done={isDetailsDone}
                    label="Loading product details"
                  />

                  {readyCount > 0 && (
                    <p className="text-center text-[11px] font-medium text-success md:text-xs">
                      ✓ {readyCount} product{readyCount > 1 ? "s" : ""} ready —
                      opening results...
                    </p>
                  )}

                  <p className="text-center text-[10px] text-text-muted md:text-xs">
                    {isUploading && "Preparing your photo..."}
                    {isSearching &&
                      "Please be patient, this can take up to 2 minutes."}
                    {isLoadingDetails &&
                      "Getting colors, sizes, and details..."}
                  </p>
                </div>
              )}

              {!isLoading && (
                <button
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
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
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border-subtle bg-white py-2.5 text-xs font-semibold text-text-secondary transition hover:bg-bg-input disabled:opacity-40 md:text-sm"
          >
            Cancel
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
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border-subtle">
            <div
              className="h-full bg-success"
              style={{
                animation: "progressSlide 1.5s infinite linear",
                width: "60%",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}