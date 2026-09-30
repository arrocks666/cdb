"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatBDT } from "@/lib/adminOrders";

type ManualItem = {
  title: string;
  price: number;
  quantity: number;
  image: string; // NEW: item photo URL
};

const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "online", label: "Online Payment" },
];

async function generateUniqueOrderId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = String(Math.floor(100000 + Math.random() * 900000));
    return id;
  }
  return String(Date.now()).slice(-6);
}

export default function NewAdminOrderPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("cod");
  const [notes, setNotes] = useState("");
  const [shipping, setShipping] = useState(200);
  const [items, setItems] = useState<ManualItem[]>([
    { title: "", price: 0, quantity: 1, image: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const subtotal = items.reduce(
    (sum, it) => sum + (it.price || 0) * (it.quantity || 0),
    0
  );
  const total = subtotal + (shipping || 0);

  const updateItem = (idx: number, patch: Partial<ManualItem>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { title: "", price: 0, quantity: 1, image: "" },
    ]);

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // NEW: Upload photo for a specific item
  const handleUploadPhoto = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setUploadingIndex(idx);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      updateItem(idx, { image: data.url });
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Customer name is required");
    if (!phone.trim()) return setError("Customer phone is required");
    if (!address.trim()) return setError("Address is required");
    if (items.length === 0) return setError("Add at least one item");
    if (items.some((it) => !it.title.trim())) {
      return setError("All items must have a name");
    }
    if (items.some((it) => it.price < 0 || it.quantity < 1)) {
      return setError("Item price and quantity must be valid");
    }

    setSaving(true);

    try {
      const orderId = await generateUniqueOrderId();
      const paymentLabel =
        PAYMENT_METHODS.find((p) => p.id === payment)?.label ?? "COD";

      const orderDoc = {
        id: orderId,
        userId: "admin-manual",
        userPhone: null,
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(),
        status: "placed",
        statusUpdatedAt: serverTimestamp(),
        items: items.map((it) => ({
          productId: `manual-${it.title.slice(0, 20)}`,
          colorId: "default",
          quantity: it.quantity,
          price: it.price,
          title: it.title,
          image: it.image || undefined, // ⚡ Save photo
          isLive: false,
        })),
        subtotal,
        shipping: shipping || 0,
        total,
        paidAmount: total, // Admin-created = full payment default
        dueAmount: 0,
        paymentMethod: paymentLabel,
        address: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          district: "",
        },
        adminNotes: notes.trim(),
      };

      await setDoc(doc(db, "orders", orderId), orderDoc);
      router.push(`/admin-panel/orders/${orderId}`);
    } catch (err: any) {
      console.error("Failed to create order:", err);
      setError(err?.message ?? "Failed to create order");
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin-panel/orders")}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-text-muted transition hover:text-gold-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Orders
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
          Manual Order
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Create Order
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Add an order received by phone, WhatsApp, or in person.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Customer Information
          </h2>
          <div className="space-y-3">
            <Field
              label="Full Name *"
              value={name}
              onChange={setName}
              placeholder="Customer's name"
            />
            <Field
              label="Phone Number *"
              value={phone}
              onChange={setPhone}
              placeholder="01XXXXXXXXX"
            />
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Full Address *
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, road, area, district..."
                rows={3}
                className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
              Items
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-gold-primary bg-white px-3 py-1.5 text-xs font-semibold text-gold-primary transition hover:bg-bg-orange"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border-subtle bg-bg-input p-3"
              >
                {/* Row 1: Photo + Name */}
                <div className="flex gap-3">
                  {/* Photo upload */}
                  <div className="flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      id={`item-photo-${idx}`}
                      className="hidden"
                      onChange={(e) => handleUploadPhoto(idx, e)}
                      disabled={uploadingIndex === idx}
                    />
                    <label
                      htmlFor={`item-photo-${idx}`}
                      className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition ${
                        item.image
                          ? "border-success bg-white"
                          : "border-border-subtle bg-white hover:border-gold-primary"
                      }`}
                    >
                      {uploadingIndex === idx ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
                      ) : item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span className="mt-1 text-[9px] text-text-muted">
                            Photo
                          </span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Product name *
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        updateItem(idx, { title: e.target.value })
                      }
                      placeholder="e.g. Zircon Ring Set"
                      className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Price, Qty, Remove */}
                <div className="mt-3 grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Price (৳)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.price || ""}
                      onChange={(e) =>
                        updateItem(idx, {
                          price: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity || 1}
                      onChange={(e) =>
                        updateItem(idx, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="flex h-9 w-full items-center justify-center rounded border border-red-primary/30 text-red-primary transition hover:bg-red-primary hover:text-white disabled:opacity-30"
                      aria-label="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Payment & summary */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Payment & Summary
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Payment Method
              </label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                Shipping (৳)
              </label>
              <input
                type="number"
                min={0}
                value={shipping}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-4 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span className="text-text-primary">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Shipping</span>
              <span className="text-text-primary">
                {formatBDT(shipping || 0)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-2">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="text-lg font-bold text-red-primary">
                {formatBDT(total)}
              </span>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Admin Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes (customer will not see this)"
            rows={3}
            className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
          />
        </section>

        {error && (
          <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin-panel/orders")}
            className="flex-1 rounded-lg border border-border-subtle bg-white py-3 text-sm font-semibold text-text-secondary transition hover:border-red-primary hover:text-red-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {saving ? "Creating..." : "Create Order"}
          </button>
        </div>
      </form>
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