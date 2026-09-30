"use client";

import { useState, useEffect } from "react";
import {
  getAllBanners,
  saveBanner,
  deleteBanner,
  updateBannerFields,
  type Banner,
} from "@/lib/firestoreBanners";

type FormState = {
  id?: string;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  textPosition: "left" | "right" | "center";
};

const EMPTY: FormState = {
  image: "",
  title: "",
  subtitle: "",
  buttonText: "",
  buttonLink: "",
  textPosition: "left",
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const list = await getAllBanners();
      setBanners(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({ ...f, image: data.url }));
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!form.image) {
      alert("Please upload an image first");
      return;
    }
    setSaving(true);
    try {
      await saveBanner({
        id: form.id,
        image: form.image,
        title: form.title.trim() || undefined,
        subtitle: form.subtitle.trim() || undefined,
        buttonText: form.buttonText.trim() || undefined,
        buttonLink: form.buttonLink.trim() || undefined,
        textPosition: form.textPosition,
        order: banners.length,
      });
      showToast(form.id ? "Banner updated" : "Banner added");
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Banner) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await deleteBanner(b.id);
      await load();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const handleMove = async (b: Banner, direction: -1 | 1) => {
    const idx = banners.findIndex((x) => x.id === b.id);
    const target = banners[idx + direction];
    if (!target) return;
    try {
      await updateBannerFields(b.id, { order: target.order });
      await updateBannerFields(target.id, { order: b.order });
      await load();
    } catch (err) {
      alert("Failed to reorder");
    }
  };

  const handleEdit = (b: Banner) => {
    setForm({
      id: b.id,
      image: b.image,
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      buttonText: b.buttonText ?? "",
      buttonLink: b.buttonLink ?? "",
      textPosition: b.textPosition ?? "left",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-text-primary px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
            Homepage Banners
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
            Banners
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Control the hero banner on the homepage.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => {
              setForm(EMPTY);
              setShowForm(true);
            }}
            className="rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
          >
            + Add Banner
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            {form.id ? "Edit Banner" : "New Banner"}
          </h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Banner Image *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-gold-primary file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-gold-luxury"
              />
              {uploading && (
                <p className="mt-2 text-xs text-gold-primary">Uploading...</p>
              )}
              {form.image && (
                <div className="mt-3 overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
                  <img
                    src={form.image}
                    alt="Banner preview"
                    className="max-h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>

            <Field
              label="Title"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="e.g. Walk Bold, Step Confident"
            />

            <Field
              label="Subtitle"
              value={form.subtitle}
              onChange={(v) => setForm({ ...form, subtitle: v })}
              placeholder="e.g. Discover footwear that turns every step into a statement"
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="Button Text"
                value={form.buttonText}
                onChange={(v) => setForm({ ...form, buttonText: v })}
                placeholder="e.g. Shop Now"
              />
              <Field
                label="Button Link"
                value={form.buttonLink}
                onChange={(v) => setForm({ ...form, buttonLink: v })}
                placeholder="e.g. /categories/shoes"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Text Position
              </label>
              <select
                value={form.textPosition}
                onChange={(e) =>
                  setForm({
                    ...form,
                    textPosition: e.target.value as FormState["textPosition"],
                  })
                }
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => {
                setForm(EMPTY);
                setShowForm(false);
              }}
              className="flex-1 rounded-lg border border-border-subtle bg-white py-2.5 text-sm font-semibold text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.image}
              className="flex-1 rounded-lg bg-gold-primary py-2.5 text-sm font-semibold text-white shadow-orange-glow disabled:opacity-40"
            >
              {saving ? "Saving..." : form.id ? "Update" : "Add Banner"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-white p-10 text-center shadow-card-dark">
          <div className="text-5xl opacity-40">🖼️</div>
          <h3 className="mt-3 font-serif text-base font-bold text-text-primary md:text-lg">
            No banners yet
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Add your first banner to replace the default homepage hero.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map((b, i) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-white p-3 shadow-card-dark"
            >
              <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
                <img src={b.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {b.title || "(no title)"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-text-muted">
                  {b.subtitle || "(no subtitle)"} • {b.textPosition}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMove(b, -1)}
                  disabled={i === 0}
                  className="flex h-8 w-8 items-center justify-center rounded border border-border-subtle text-text-secondary disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleMove(b, 1)}
                  disabled={i === banners.length - 1}
                  className="flex h-8 w-8 items-center justify-center rounded border border-border-subtle text-text-secondary disabled:opacity-30"
                >
                  ▼
                </button>
                <button
                  onClick={() => handleEdit(b)}
                  className="rounded border border-border-subtle px-3 py-1.5 text-xs font-semibold text-gold-primary"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="rounded border border-red-primary/40 px-3 py-1.5 text-xs font-semibold text-red-primary"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
      />
    </div>
  );
}