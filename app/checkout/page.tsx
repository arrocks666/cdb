"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { products, formatBDT } from "@/lib/data";
import { useCart } from "@/lib/CartContext";
import { useOrders } from "@/lib/OrderContext";

function proxyImage(url: string | undefined | null): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", icon: "💵", note: "Pay when you receive" },
  { id: "bkash", label: "bKash", icon: "📱", note: "Pay with bKash" },
  { id: "nagad", label: "Nagad", icon: "📲", note: "Pay with Nagad" },
  { id: "online", label: "Online Payment", icon: "💳", note: "Visa, MasterCard, SSL" },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();
  const orders = useOrders();

  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);

  const [address, setAddress] = useState({
    name: "Md. Rahat Islam",
    phone: "+880 1712 345678",
    address: "Natore Sadar, Natore",
    district: "Natore",
  });

  const itemsParam = searchParams.get("items") ?? "";
  const selectedKeys = itemsParam
    ? itemsParam.split(",").filter(Boolean)
    : cart.items.map((i) => `${i.productId}-${i.colorId}`);

  const rows = useMemo(() => {
    return cart.items
      .filter((i) => selectedKeys.includes(`${i.productId}-${i.colorId}`))
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const color = product.colors.find((c) => c.id === item.colorId);
        return {
          productId: product.id,
          colorId: item.colorId,
          colorLabel: color?.label ?? "Default",
          quantity: item.quantity,
          price: product.price,
          product,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      colorId: string;
      colorLabel: string;
      quantity: number;
      price: number;
      product: (typeof products)[number];
    }>;
  }, [cart.items, selectedKeys.join(",")]);

  const subtotal = rows.reduce((sum, r) => sum + r.price * r.quantity, 0);
  const shipping = rows.length > 0 ? 200 : 0;
  const total = subtotal + shipping;

  const handlePlaceOrder = () => {
    if (rows.length === 0) return;
    setPlacing(true);

    const newOrder = orders.addOrder({
      items: rows.map((r) => ({
        productId: r.productId,
        colorId: r.colorId,
        quantity: r.quantity,
        price: r.price,
      })),
      subtotal,
      shipping,
      total,
      paymentMethod: PAYMENT_METHODS.find((p) => p.id === payment)?.label ?? "COD",
      address,
    });

    rows.forEach((r) => cart.remove(r.productId, r.colorId));

    setTimeout(() => {
      router.push(`/orders/${newOrder.id}`);
    }, 400);
  };

  if (rows.length === 0 && !placing) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="text-6xl opacity-60">🛒</div>
        <h1 className="mt-4 font-serif text-xl font-bold">
          <span className="gold-text">Nothing to checkout</span>
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Your cart is empty or nothing was selected.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full bg-red-primary px-6 py-2.5 text-xs font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
        >
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Top bar with step indicator */}
      <div
        className="sticky top-[56px] z-40 border-b border-border-subtle shadow-lg md:top-[60px]"
        style={{ backgroundColor: "#080808" }}
      >
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <Link
            href="/cart"
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="flex-1 font-serif text-lg font-bold md:text-xl">
            <span className="gold-text">Checkout</span>
          </h1>
        </div>

        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-3">
          <StepDot num={1} label="Address" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
          <div className={`mx-2 h-0.5 flex-1 ${step > 1 ? "bg-red-primary" : "bg-border-subtle"}`} />
          <StepDot num={2} label="Payment" active={step === 2} done={step > 2} onClick={() => setStep(2)} />
          <div className={`mx-2 h-0.5 flex-1 ${step > 2 ? "bg-red-primary" : "bg-border-subtle"}`} />
          <StepDot num={3} label="Confirm" active={step === 3} done={false} onClick={() => setStep(3)} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
        {/* Step 1 — Address */}
        {step === 1 && (
          <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-base font-bold text-gold-primary md:text-lg">
                Delivery Address
              </h2>
              <span className="text-[11px] font-medium text-red-primary md:text-xs">
                + Add New
              </span>
            </div>

            <div className="space-y-3">
              <Field label="Full Name" value={address.name} onChange={(v) => setAddress({ ...address, name: v })} />
              <Field label="Phone Number" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
              <Field label="Full Address" value={address.address} onChange={(v) => setAddress({ ...address, address: v })} />
              <Field label="District" value={address.district} onChange={(v) => setAddress({ ...address, district: v })} />
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-5 w-full rounded-lg bg-red-primary py-3 text-sm font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {/* Step 2 — Payment */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
              <h2 className="mb-4 font-serif text-base font-bold text-gold-primary md:text-lg">
                Payment Method
              </h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPayment(method.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                      payment === method.id
                        ? "border-red-primary bg-red-primary/10"
                        : "border-gold-primary/40 bg-bg-card-elevated hover:border-gold-primary"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                        payment === method.id ? "border-red-primary" : "border-gold-primary/60"
                      }`}
                    >
                      {payment === method.id && (
                        <span className="h-2.5 w-2.5 rounded-full bg-red-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary md:text-base">
                        <span>{method.icon}</span>
                        {method.label}
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
                        {method.note}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-gold-primary/60 bg-bg-card py-3 text-sm font-semibold text-gold-primary transition hover:border-gold-primary"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-lg bg-red-primary py-3 text-sm font-semibold text-white shadow-red-glow transition hover:bg-red-bright"
              >
                Review Order
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
              <h2 className="mb-3 font-serif text-base font-bold text-gold-primary md:text-lg">
                Shipping To
              </h2>
              <p className="text-sm font-semibold text-text-primary md:text-base">
                {address.name}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary md:text-sm">{address.phone}</p>
              <p className="mt-0.5 text-xs text-text-secondary md:text-sm">{address.address}</p>
            </div>

            <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
              <h2 className="mb-3 font-serif text-base font-bold text-gold-primary md:text-lg">
                Order Summary
              </h2>
              <div className="space-y-3">
                {rows.map((r) => (
                  <div
                    key={`${r.productId}-${r.colorId}`}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold-primary/40 bg-bg-card-elevated p-1">
                      {r.product.image ? (
                        <img
                          src={proxyImage(r.product.image)}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-xl">📦</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {r.product.title}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {r.colorLabel} × {r.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-primary">
                      {formatBDT(r.price * r.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gold-primary/40 bg-bg-card p-4 shadow-card-dark md:p-5">
              <div className="space-y-1.5 text-xs md:text-sm">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span className="text-text-primary">{formatBDT(subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  <span className="text-text-primary">{formatBDT(shipping)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Payment</span>
                  <span className="text-text-primary">
                    {PAYMENT_METHODS.find((p) => p.id === payment)?.label}
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border-subtle pt-2">
                  <span className="text-sm font-semibold text-text-primary md:text-base">
                    Total Amount
                  </span>
                  <span className="text-lg font-bold text-red-primary md:text-xl">
                    {formatBDT(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={placing}
                className="flex-1 rounded-lg border border-gold-primary/60 bg-bg-card py-3 text-sm font-semibold text-gold-primary transition hover:border-gold-primary disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="flex-1 rounded-lg bg-red-primary py-3 text-sm font-semibold text-white shadow-red-glow transition hover:bg-red-bright disabled:opacity-60"
              >
                {placing ? "Placing..." : "Place Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({
  num,
  label,
  active,
  done,
  onClick,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  const state = done ? "done" : active ? "active" : "pending";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
          state === "done"
            ? "border-success bg-success text-white"
            : state === "active"
              ? "border-red-primary bg-red-primary text-white shadow-red-glow"
              : "border-gold-primary/40 bg-bg-card text-gold-primary/60"
        }`}
      >
        {done ? "✓" : num}
      </div>
      <span
        className={`text-[10px] font-medium md:text-xs ${
          state === "active"
            ? "text-red-primary"
            : state === "done"
              ? "text-success"
              : "text-text-muted"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        className="w-full rounded-lg border border-gold-primary/40 bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}