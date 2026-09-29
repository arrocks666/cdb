"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  computePrice,
  cnyToCostBdt,
  DEFAULT_PRICING,
  formatBDTPrice,
  formatCNY,
  formatUSD,
} from "@/lib/pricing";
import { categories } from "@/lib/categories";

export type ProductFormData = {
  id?: string;
  title: string;
  subtitle: string;
  priceCny: number;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  inStock: boolean;
  stockCount: number;
  description: string;
  categoryId: string;
  subcategoryId: string;
  supplierName: string;
  sourceUrl: string;
  moq: number;
  priceOverride: boolean;
  isFlashSale: boolean;
  isTrending: boolean;
};

const EMPTY_FORM: ProductFormData = {
  title: "",
  subtitle: "",
  priceCny: 0,
  price: 0,
  oldPrice: 0,
  discount: 0,
  rating: 4.5,
  reviews: 0,
  image: "",
  gallery: [],
  inStock: true,
  stockCount: 100,
  description: "",
  categoryId: "",
  subcategoryId: "",
  supplierName: "",
  sourceUrl: "",
  moq: 1,
  priceOverride: false,
  isFlashSale: false,
  isTrending: false,
};

export default function ProductForm({
  productId,
}: {
  productId?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [galleryInput, setGalleryInput] = useState("");

  // Load existing product for edit
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, "products", productId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setError("Product not found");
          return;
        }
        const d = snap.data() as Record<string, unknown>;
        setForm({
          ...EMPTY_FORM,
          ...d,
          priceCny: (d.priceOriginalCny as number) ?? 0,
          subtitle: (d.subtitle as string) ?? "",
          gallery: (d.gallery as string[]) ?? [],
          colors: undefined,
        } as ProductFormData);
        setGalleryInput(
          Array.isArray(d.gallery) ? (d.gallery as string[]).join("\n") : ""
        );
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Failed to load product");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Auto-compute selling price from CNY
  const breakdown = computePrice(form.priceCny, DEFAULT_PRICING);

  useEffect(() => {
    if (!form.priceOverride && form.priceCny > 0) {
      setForm((f) => ({
        ...f,
        price: breakdown.sellingBdt,
        oldPrice: Math.round(breakdown.costBdt * 1.7),
        discount: Math.round(
          ((breakdown.sellingBdt * 1.35 - breakdown.sellingBdt) /
            (breakdown.sellingBdt * 1.35)) *
            100
        ),
      }));
    }
  }, [form.priceCny, form.priceOverride, breakdown.sellingBdt, breakdown.costBdt]);

  const update = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError("Title is required");
    if (!form.image.trim()) return setError("Main image URL is required");
    if (!form.categoryId) return setError("Category is required");
    if (form.price <= 0) return setError("Selling price must be greater than 0");

    setSaving(true);

    try {
      const gallery = galleryInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const docData: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        price: form.price,
        oldPrice: form.oldPrice,
        discount: form.discount,
        rating: form.rating,
        reviews: form.reviews,
        image: form.image.trim(),
        gallery,
        colors: [],
        inStock: form.inStock,
        stockCount: form.stockCount,
        features: [],
        description: form.description.trim(),
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId,
        supplierName: form.supplierName.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        moq: form.moq,
        priceOriginalCny: form.priceCny,
        costBdt: cnyToCostBdt(form.priceCny, DEFAULT_PRICING),
        isFlashSale: form.isFlashSale,
        isTrending: form.isTrending,
        isLive: false,
        updatedAt: serverTimestamp(),
      };

      // Strip undefined for Firestore
      Object.keys(docData).forEach((k) => {
        if (docData[k] === undefined) delete docData[k];
      });

      if (isEdit && productId) {
        await setDoc(doc(db, "products", productId), docData, { merge: true });
        router.push("/admin-panel/products");
      } else {
        const newRef = doc(collection(db, "products"));
        docData.createdAt = serverTimestamp();
        docData.views = 0;
        await setDoc(newRef, docData);
        router.push("/admin-panel/products");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err?.message ?? "Failed to save product");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.id === form.categoryId);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic info */}
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Basic Information
        </h2>
        <div className="space-y-3">
          <Input
            label="Title *"
            value={form.title}
            onChange={(v) => update("title", v)}
            placeholder="e.g. Zircon Ring Set"
          />
          <Input
            label="Subtitle"
            value={form.subtitle}
            onChange={(v) => update("subtitle", v)}
            placeholder="Optional short description"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Category *
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => {
                  update("categoryId", e.target.value);
                  update("subcategoryId", "");
                }}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Subcategory
              </label>
              <select
                value={form.subcategoryId}
                onChange={(e) => update("subcategoryId", e.target.value)}
                disabled={!activeCategory}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none disabled:opacity-50"
              >
                <option value="">None</option>
                {activeCategory?.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Images
        </h2>
        <div className="space-y-3">
          <Input
            label="Main image URL *"
            value={form.image}
            onChange={(v) => update("image", v)}
            placeholder="https://..."
          />
          {form.image && (
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
              <img
                src={form.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain p-1"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Gallery image URLs (one per line)
            </label>
            <textarea
              value={galleryInput}
              onChange={(e) => setGalleryInput(e.target.value)}
              placeholder="https://...&#10;https://...&#10;https://..."
              rows={4}
              className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
          Pricing
        </h2>
        <p className="mb-4 text-xs text-text-muted">
          Enter the 1688 price in CNY (¥). Selling price is calculated automatically.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            label="1688 Price (CNY ¥) *"
            type="number"
            value={String(form.priceCny || "")}
            onChange={(v) => update("priceCny", Number(v) || 0)}
            placeholder="e.g. 19.5"
          />
          <div className="rounded-lg border border-border-subtle bg-bg-input p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Cost in BDT
            </p>
            <p className="mt-1 text-base font-bold text-text-primary">
              {formatBDTPrice(breakdown.costBdt)}
            </p>
            <p className="mt-0.5 text-[10px] text-text-muted">
              ¥{form.priceCny || 0} → {formatUSD(breakdown.priceUsd)} → BDT
            </p>
          </div>
          <div className="rounded-lg border border-gold-primary/40 bg-bg-orange p-3">
            <p className="text-[10px] uppercase tracking-wider text-gold-primary">
              Selling Price
            </p>
            <p className="mt-1 text-base font-bold text-red-primary">
              {formatBDTPrice(form.price)}
            </p>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {breakdown.markupLabel} · ×{breakdown.markupMultiplier}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.priceOverride}
              onChange={(e) => update("priceOverride", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-text-secondary">
              Override price manually
            </span>
          </label>
          {form.priceOverride && (
            <input
              type="number"
              min={0}
              value={form.price || ""}
              onChange={(e) => update("price", Number(e.target.value) || 0)}
              className="w-32 rounded-lg border border-border-subtle bg-bg-input px-3 py-1.5 text-sm focus:border-gold-primary focus:outline-none"
              placeholder="Custom price"
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Old Price (৳)"
            type="number"
            value={String(form.oldPrice || "")}
            onChange={(v) => update("oldPrice", Number(v) || 0)}
            placeholder="e.g. 700"
          />
          <Input
            label="Discount %"
            type="number"
            value={String(form.discount || "")}
            onChange={(v) => update("discount", Number(v) || 0)}
            placeholder="e.g. 20"
          />
        </div>
      </section>

      {/* Stock */}
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Stock
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            label="Stock Count"
            type="number"
            value={String(form.stockCount || 0)}
            onChange={(v) => update("stockCount", Number(v) || 0)}
          />
          <Input
            label="MOQ (min order)"
            type="number"
            value={String(form.moq || 1)}
            onChange={(v) => update("moq", Number(v) || 1)}
          />
          <label className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) => update("inStock", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-text-secondary">In Stock</span>
          </label>
        </div>
      </section>

      {/* Description + supplier */}
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Details
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              placeholder="Product description..."
              className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
            />
          </div>
          <Input
            label="Supplier name"
            value={form.supplierName}
            onChange={(v) => update("supplierName", v)}
            placeholder="Optional"
          />
          <Input
            label="Source URL (admin only)"
            value={form.sourceUrl}
            onChange={(v) => update("sourceUrl", v)}
            placeholder="https://detail.1688.com/..."
          />
        </div>
      </section>

      {/* Flags */}
      <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Homepage Placement
        </h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isFlashSale}
              onChange={(e) => update("isFlashSale", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-text-secondary">⚡ Show in Flash Sale</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isTrending}
              onChange={(e) => update("isTrending", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-text-secondary">🔥 Show in Trending</span>
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin-panel/products")}
          className="flex-1 rounded-lg border border-border-subtle bg-white py-3 text-sm font-semibold text-text-secondary transition hover:border-red-primary hover:text-red-primary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
      />
    </div>
  );
}