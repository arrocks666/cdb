"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatBDT } from "@/lib/data";
import { useProducts } from "@/lib/ProductsContext";
import { useCart } from "@/lib/CartContext";
import { useOrders } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import LoginPromptModal from "@/components/LoginPromptModal";
import {
  getUserCoupons,
  filterValidCoupons,
  markCouponUsed,
  type Coupon,
} from "@/lib/coupons";

const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", icon: "💵", note: "Pay when you receive" },
  { id: "bkash", label: "bKash", icon: "📱", note: "Pay with bKash" },
  { id: "nagad", label: "Nagad", icon: "📲", note: "Pay with Nagad" },
  { id: "online", label: "Online Payment", icon: "💳", note: "Visa, MasterCard, SSL" },
];

function CheckoutImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="text-xl">📦</span>;
  return <img src={src} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} />;
}

type CheckoutRow = {
  productId: string;
  colorId: string;
  quantity: number;
  price: number;
  title: string;
  image: string;
  isLive: boolean;
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();
  const orders = useOrders();
  const { user } = useAuth();
  const { products } = useProducts();

  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    address: "",
    district: "",
  });

  // Coupon state
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Load user's coupons when logged in
  useEffect(() => {
    if (!user) {
      setAvailableCoupons([]);
      return;
    }
    (async () => {
      const all = await getUserCoupons(user.uid);
      setAvailableCoupons(filterValidCoupons(all));
    })();
  }, [user]);

  const itemsParam = searchParams.get("items") ?? "";
  const selectedKeys = itemsParam
    ? itemsParam.split(",").filter(Boolean)
    : cart.items.map((i) => `${i.productId}-${i.colorId}`);

  const rows = useMemo<CheckoutRow[]>(() => {
    const result: CheckoutRow[] = [];

    for (const item of cart.items) {
      const key = `${item.productId}-${item.colorId}`;
      if (!selectedKeys.includes(key)) continue;

      if (item.isLive && item.liveSnapshot) {
        result.push({
          productId: item.productId,
          colorId: item.colorId,
          quantity: item.quantity,
          price: item.liveSnapshot.price,
          title: item.liveSnapshot.title,
          image: item.liveSnapshot.image,
          isLive: true,
        });
        continue;
      }

      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      result.push({
        productId: product.id,
        colorId: item.colorId,
        quantity: item.quantity,
        price: product.price,
        title: product.title,
        image: product.image,
        isLive: false,
      });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.items, selectedKeys.join(","), products]);

  const subtotal = rows.reduce((sum, r) => sum + r.price * r.quantity, 0);
  const shipping = rows.length > 0 ? 200 : 0;
  const discountAmount = appliedCoupon
    ? Math.round((subtotal * appliedCoupon.percent) / 100)
    : 0;
  const total = subtotal + shipping - discountAmount;

  const handleApplyCoupon = (code: string) => {
    setCouponError(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    const found = availableCoupons.find((c) => c.code === trimmed);
    if (!found) {
      setCouponError("Invalid or expired coupon");
      return;
    }
    setAppliedCoupon(found);
    setCouponInput("");
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      setLoginPromptOpen(true);
      return;
    }

    if (rows.length === 0) return;
    setPlacing(true);
    setError(null);

    try {
      const newOrder = await orders.addOrder({
        items: rows.map((r) => ({
          productId: r.productId,
          colorId: r.colorId,
          quantity: r.quantity,
          price: r.price,
          title: r.title,
          image: r.image,
          isLive: r.isLive,
        })),
        subtotal,
        shipping,
        total,
        paymentMethod: PAYMENT_METHODS.find((p) => p.id === payment)?.label ?? "COD",
        address,
      });

      // Mark coupon as used (if applied)
      if (appliedCoupon && user) {
        try {
          await markCouponUsed(user.uid, appliedCoupon, newOrder.id);
        } catch (err) {
          console.error("Failed to mark coupon used:", err);
        }
      }

      rows.forEach((r) => cart.remove(r.productId, r.colorId));
      router.push(`/orders/${newOrder.id}`);
    } catch (err: any) {
      console.error("Order error:", err);
      setError(err?.message ?? "Failed to place order. Please try again.");
      setPlacing(false);
    }
  };

  if (rows.length === 0 && !placing) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="text-6xl opacity-40">🛒</div>
          <h1 className="mt-4 text-xl font-bold text-text-primary">Nothing to checkout</h1>
          <Link href="/" className="mt-5 inline-block rounded-full bg-gold-primary px-6 py-2.5 text-xs font-semibold text-white shadow-orange-glow">
            Go Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-bg-secondary pb-8">
        <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
          <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
            <Link href="/cart" className="flex h-8 w-8 items-center justify-center text-text-primary hover:text-gold-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </Link>
            <h1 className="flex-1 text-lg font-bold text-text-primary md:text-xl">Checkout</h1>
          </div>
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-3">
            <StepDot num={1} label="Address" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
            <div className={`mx-2 h-0.5 flex-1 ${step > 1 ? "bg-gold-primary" : "bg-border-subtle"}`} />
            <StepDot num={2} label="Payment" active={step === 2} done={step > 2} onClick={() => setStep(2)} />
            <div className={`mx-2 h-0.5 flex-1 ${step > 2 ? "bg-gold-primary" : "bg-border-subtle"}`} />
            <StepDot num={3} label="Confirm" active={step === 3} done={false} onClick={() => setStep(3)} />
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
          {step === 1 && (
            <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
              <h2 className="mb-4 text-base font-bold text-text-primary md:text-lg">Delivery Address</h2>
              <div className="space-y-3">
                <Field label="Full Name" value={address.name} onChange={(v) => setAddress({ ...address, name: v })} placeholder="Enter your full name" />
                <Field label="Phone Number" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} placeholder="+880 1XXX XXXXXX" />
                <Field label="Full Address" value={address.address} onChange={(v) => setAddress({ ...address, address: v })} placeholder="House, Road, Area" />
                <Field label="District" value={address.district} onChange={(v) => setAddress({ ...address, district: v })} placeholder="e.g., Dhaka" />
              </div>
              <button onClick={() => setStep(2)} className="mt-5 w-full rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow">
                Continue to Payment
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
                <h2 className="mb-4 text-base font-bold text-text-primary md:text-lg">Payment Method</h2>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button key={method.id} onClick={() => setPayment(method.id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${payment === method.id ? "border-gold-primary bg-bg-orange" : "border-border-subtle bg-white hover:border-gold-primary"}`}>
                      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${payment === method.id ? "border-gold-primary" : "border-border-subtle"}`}>
                        {payment === method.id && <span className="h-2.5 w-2.5 rounded-full bg-gold-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary md:text-base"><span>{method.icon}</span>{method.label}</div>
                        <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">{method.note}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-border-subtle bg-white py-3 text-sm font-semibold text-text-secondary">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow">Review Order</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
                <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">Shipping To</h2>
                <p className="text-sm font-semibold text-text-primary md:text-base">{address.name || "—"}</p>
                <p className="mt-0.5 text-xs text-text-secondary md:text-sm">{address.phone || "—"}</p>
                <p className="mt-0.5 text-xs text-text-secondary md:text-sm">{address.address || "—"}</p>
                <p className="mt-0.5 text-xs text-text-secondary md:text-sm">{address.district || "—"}</p>
              </div>

              <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
                <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">Order Summary</h2>
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={`${r.productId}-${r.colorId}`} className="flex items-center gap-3">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-white p-1">
                        <CheckoutImage src={r.image} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{r.title}</p>
                        <p className="text-[11px] text-text-muted">Qty {r.quantity}</p>
                      </div>
                      <span className="text-sm font-bold text-red-primary">{formatBDT(r.price * r.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* COUPON SECTION */}
              {user && (
                <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
                  <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">
                    Have a Coupon?
                  </h2>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg border border-success/40 bg-success/5 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-success md:text-sm">
                          ✓ {appliedCoupon.code} applied
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          {appliedCoupon.percent}% off subtotal
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-semibold text-red-primary underline md:text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Enter code e.g. CDB-4F2A91"
                          className="flex-1 rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
                        />
                        <button
                          onClick={() => handleApplyCoupon(couponInput)}
                          disabled={!couponInput.trim()}
                          className="rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
                        >
                          Apply
                        </button>
                      </div>

                      {couponError && (
                        <p className="mt-2 text-[11px] text-red-primary md:text-xs">
                          {couponError}
                        </p>
                      )}

                      {availableCoupons.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            Your Available Coupons
                          </p>
                          {availableCoupons.map((c) => (
                            <button
                              key={c.code}
                              onClick={() => handleApplyCoupon(c.code)}
                              className="flex w-full items-center justify-between rounded border border-gold-primary/30 bg-bg-orange px-3 py-2 text-xs transition hover:border-gold-primary"
                            >
                              <span className="font-mono font-bold text-gold-primary">
                                {c.code}
                              </span>
                              <span className="font-semibold text-text-primary">
                                {c.percent}% OFF
                              </span>
                              <span className="text-text-muted">Tap to apply</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
                <div className="space-y-1.5 text-xs md:text-sm">
                  <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span className="text-text-primary">{formatBDT(subtotal)}</span></div>
                  <div className="flex justify-between text-text-secondary"><span>Shipping</span><span className="text-text-primary">{formatBDT(shipping)}</span></div>
                  {appliedCoupon && discountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Coupon ({appliedCoupon.percent}%)</span>
                      <span>-{formatBDT(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-text-secondary"><span>Payment</span><span className="text-text-primary">{PAYMENT_METHODS.find((p) => p.id === payment)?.label}</span></div>
                  <div className="mt-2 flex justify-between border-t border-border-subtle pt-2">
                    <span className="text-sm font-semibold text-text-primary md:text-base">Total</span>
                    <span className="text-lg font-bold text-red-primary md:text-xl">{formatBDT(total)}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} disabled={placing} className="flex-1 rounded-lg border border-border-subtle bg-white py-3 text-sm font-semibold text-text-secondary disabled:opacity-40">Back</button>
                <button onClick={handlePlaceOrder} disabled={placing} className="flex-1 rounded-lg bg-gold-primary py-3 text-sm font-semibold text-white shadow-orange-glow disabled:opacity-60">
                  {placing ? "Placing..." : "Place Order"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <LoginPromptModal
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        title="Login to place order"
        message="Please login or create an account to place your order. Your cart will be saved."
      />
    </>
  );
}

function StepDot({ num, label, active, done, onClick }: { num: number; label: string; active: boolean; done: boolean; onClick: () => void }) {
  const state = done ? "done" : active ? "active" : "pending";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
        state === "done" ? "border-success bg-success text-white" :
        state === "active" ? "border-gold-primary bg-gold-primary text-white shadow-orange-glow" :
        "border-border-subtle bg-white text-text-muted"
      }`}>{done ? "✓" : num}</div>
      <span className={`text-[10px] font-medium md:text-xs ${
        state === "active" ? "text-gold-primary" : state === "done" ? "text-success" : "text-text-muted"
      }`}>{label}</span>
    </button>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none" />
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