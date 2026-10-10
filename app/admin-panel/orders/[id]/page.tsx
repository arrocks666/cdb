"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Order,
  OrderStatus,
  OrderPayment,
  OrderCharges,
  STATUS_ORDER,
  STATUS_LABELS,
} from "@/lib/OrderContext";
import { formatBDT, formatDateTime } from "@/lib/adminOrders";
import { generateInvoice } from "@/lib/generateInvoice";
import {
  loadSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/firestoreSettings";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [status, setStatus] = useState<OrderStatus>("placed");
  const [chinaOrderIds, setChinaOrderIds] = useState<string[]>([""]);
  const [adminNotes, setAdminNotes] = useState("");

  const [shippingOverride, setShippingOverride] = useState<string>("");
  const [savingShipping, setSavingShipping] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const [chinaLocalCourier, setChinaLocalCourier] = useState<string>("");
  const [bdCourier, setBdCourier] = useState<string>("");
  const [shippingWeightKg, setShippingWeightKg] = useState<string>("");
  const [shippingRatePerKg, setShippingRatePerKg] = useState<string>("");
  const [showChinaLocalCourier, setShowChinaLocalCourier] = useState(false);
  const [showBdCourier, setShowBdCourier] = useState(false);
  const [showShippingCharge, setShowShippingCharge] = useState(false);
  const [savingCharges, setSavingCharges] = useState(false);

  const [savingStatus, setSavingStatus] = useState(false);
  const [savingChina, setSavingChina] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, "orders", id))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as Omit<Order, "id">) };
        setOrder(data);
        setStatus(data.status);

        const loadedIds: string[] = Array.isArray(data.chinaOrderIds)
          ? data.chinaOrderIds.filter((x) => typeof x === "string")
          : data.chinaOrderId
          ? [data.chinaOrderId]
          : [];
        setChinaOrderIds(loadedIds.length > 0 ? loadedIds : [""]);

        setAdminNotes(data.adminNotes ?? "");
        setShippingOverride(String(data.shipping ?? 0));

        const c = data.charges ?? {};
        setChinaLocalCourier(
          c.chinaLocalCourier != null ? String(c.chinaLocalCourier) : ""
        );
        setBdCourier(c.bdCourier != null ? String(c.bdCourier) : "");
        setShippingWeightKg(
          c.shippingWeightKg != null ? String(c.shippingWeightKg) : ""
        );
        setShippingRatePerKg(
          c.shippingRatePerKg != null ? String(c.shippingRatePerKg) : ""
        );
        setShowChinaLocalCourier(!!c.showChinaLocalCourier);
        setShowBdCourier(!!c.showBdCourier);
        setShowShippingCharge(!!c.showShippingCharge);
      })
      .catch((err) => {
        console.error("Error loading order:", err);
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSaveStatus = async () => {
    setSavingStatus(true);
    try {
      await updateDoc(doc(db, "orders", id), {
        status,
        statusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (order) setOrder({ ...order, status });
      showToast("Status updated");
    } catch (err) {
      console.error(err);
      showToast("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const addChinaId = () => setChinaOrderIds((prev) => [...prev, ""]);
  const removeChinaId = (idx: number) =>
    setChinaOrderIds((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [""];
    });
  const updateChinaId = (idx: number, value: string) =>
    setChinaOrderIds((prev) => prev.map((x, i) => (i === idx ? value : x)));

  const handleSaveChina = async () => {
    setSavingChina(true);
    try {
      const cleaned = chinaOrderIds.map((x) => x.trim()).filter(Boolean);

      await updateDoc(doc(db, "orders", id), {
        chinaOrderIds: cleaned,
        chinaOrderId: cleaned[0] ?? "",
        updatedAt: serverTimestamp(),
      });

      if (order) {
        setOrder({
          ...order,
          chinaOrderIds: cleaned,
          chinaOrderId: cleaned[0] ?? "",
        });
      }

      setChinaOrderIds(cleaned.length > 0 ? cleaned : [""]);
      showToast("China Order IDs saved");
    } catch (err) {
      console.error(err);
      showToast("Failed to save");
    } finally {
      setSavingChina(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateDoc(doc(db, "orders", id), {
        adminNotes: adminNotes.trim(),
        updatedAt: serverTimestamp(),
      });
      if (order) setOrder({ ...order, adminNotes: adminNotes.trim() });
      showToast("Notes saved");
    } catch (err) {
      console.error(err);
      showToast("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveShipping = async () => {
    if (!order) return;
    const newShipping = Number(shippingOverride) || 0;
    const newTotal = order.subtotal + newShipping;
    const paidAmount = order.paidAmount ?? 0;
    const newDueAmount = Math.max(0, newTotal - paidAmount);

    setSavingShipping(true);
    try {
      await updateDoc(doc(db, "orders", id), {
        shipping: newShipping,
        total: newTotal,
        paidAmount,
        dueAmount: newDueAmount,
        updatedAt: serverTimestamp(),
      });

      setOrder({
        ...order,
        shipping: newShipping,
        total: newTotal,
        paidAmount,
        dueAmount: newDueAmount,
      });
      showToast("Shipping updated");
    } catch (err) {
      console.error(err);
      showToast("Failed to update shipping");
    } finally {
      setSavingShipping(false);
    }
  };

  const handleAddPayment = async () => {
    if (!order) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      showToast("Enter a valid amount");
      return;
    }

    setAddingPayment(true);
    try {
      const noteTrimmed = paymentNote.trim();
      const newPayment: OrderPayment = {
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount,
        date: Date.now(),
        addedBy: "admin",
        ...(noteTrimmed ? { note: noteTrimmed } : {}),
      };

      const existing = order.payments ?? [];
      const payments = [...existing, newPayment];
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const dueAmount = Math.max(0, order.total - paidAmount);

      await updateDoc(doc(db, "orders", id), {
        payments,
        paidAmount,
        dueAmount,
        updatedAt: serverTimestamp(),
      });

      setOrder({ ...order, payments, paidAmount, dueAmount });
      setPaymentAmount("");
      setPaymentNote("");
      showToast("Payment added");
    } catch (err) {
      console.error(err);
      showToast("Failed to add payment");
    } finally {
      setAddingPayment(false);
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!order) return;
    if (!confirm("Remove this payment?")) return;

    try {
      const existing = order.payments ?? [];
      const payments = existing.filter((p) => p.id !== paymentId);
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const dueAmount = Math.max(0, order.total - paidAmount);

      await updateDoc(doc(db, "orders", id), {
        payments,
        paidAmount,
        dueAmount,
        updatedAt: serverTimestamp(),
      });

      setOrder({ ...order, payments, paidAmount, dueAmount });
      showToast("Payment removed");
    } catch (err) {
      console.error(err);
      showToast("Failed to remove payment");
    }
  };

  const handleMarkPaid = async () => {
    if (!order) return;
    const remainingDue = Math.max(0, order.total - (order.paidAmount ?? 0));
    if (remainingDue <= 0) return;

    try {
      const newPayment: OrderPayment = {
        id: `p_${Date.now()}_fully`,
        amount: remainingDue,
        date: Date.now(),
        note: "Marked fully paid",
        addedBy: "admin",
      };

      const existing = order.payments ?? [];
      const payments = [...existing, newPayment];
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const dueAmount = Math.max(0, order.total - paidAmount);

      await updateDoc(doc(db, "orders", id), {
        payments,
        paidAmount,
        dueAmount,
        updatedAt: serverTimestamp(),
      });

      setOrder({ ...order, payments, paidAmount, dueAmount });
      showToast("Marked as fully paid");
    } catch (err) {
      console.error(err);
      showToast("Failed to update");
    }
  };

  const computedShippingCharge =
    (Number(shippingWeightKg) || 0) * (Number(shippingRatePerKg) || 0);

  const handleSaveCharges = async () => {
    if (!order) return;
    setSavingCharges(true);

    try {
      const clc = Number(chinaLocalCourier);
      const bd = Number(bdCourier);
      const wkg = Number(shippingWeightKg);
      const rkg = Number(shippingRatePerKg);

      const newCharges: OrderCharges = {
        showChinaLocalCourier,
        showBdCourier,
        showShippingCharge,
        ...(clc > 0 ? { chinaLocalCourier: clc } : {}),
        ...(bd > 0 ? { bdCourier: bd } : {}),
        ...(wkg > 0 ? { shippingWeightKg: wkg } : {}),
        ...(rkg > 0 ? { shippingRatePerKg: rkg } : {}),
        ...(computedShippingCharge > 0
          ? { shippingCharge: computedShippingCharge }
          : {}),
      };

      await updateDoc(doc(db, "orders", id), {
        charges: newCharges,
        updatedAt: serverTimestamp(),
      });

      setOrder({ ...order, charges: newCharges });
      showToast("Charges saved");
    } catch (err) {
      console.error(err);
      showToast("Failed to save charges");
    } finally {
      setSavingCharges(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      await generateInvoice(
        order,
        "ChinaDailyBazar",
        "chinadailybazar.netlify.app",
        settings.logoUrl || undefined
      );
      showToast("Invoice downloaded");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate invoice");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="rounded-lg border border-border-subtle bg-white p-10 text-center shadow-card-dark">
        <div className="text-5xl opacity-40">📭</div>
        <h3 className="mt-3 font-serif text-lg font-bold text-text-primary">
          Order not found
        </h3>
        <Link
          href="/admin-panel/orders"
          className="mt-4 inline-block rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const isManual = order.userId === "admin-manual";
  const currentStatusIdx = STATUS_ORDER.indexOf(status);
  const orderPaid = order.paidAmount ?? 0;
  const orderDue = Math.max(0, order.total - orderPaid);
  const isFullyPaid = orderDue === 0;
  const payments = order.payments ?? [];

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-text-primary px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

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

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
              Order Detail
            </div>
            {isManual && (
              <span className="rounded-full bg-bg-input px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Manual
              </span>
            )}
            {isFullyPaid ? (
              <span className="rounded-full bg-success/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                ✅ Paid
              </span>
            ) : (
              <span className="rounded-full bg-red-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-primary">
                ⏳ Due {formatBDT(orderDue)}
              </span>
            )}
          </div>

          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="flex items-center gap-2 rounded-lg border-2 border-gold-primary bg-white px-4 py-2 text-sm font-semibold text-gold-primary transition hover:bg-bg-orange disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Generating..." : "Download Invoice"}
          </button>
        </div>

        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Order #{order.id}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Placed {formatDateTime(order.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Site Order ID (Customer)
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-gold-primary">
            #{order.id}
          </p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            China Order IDs (Admin only)
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-text-primary">
            {order.chinaOrderIds && order.chinaOrderIds.length > 0
              ? order.chinaOrderIds.join(", ")
              : order.chinaOrderId || "— not set —"}
          </p>
        </div>
      </div>

      <section className="mt-5 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
          Shipping Charge
        </h2>
        <p className="mb-3 text-xs text-text-muted">
          Editable. Changing this recalculates the order total and due amount.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={shippingOverride}
            onChange={(e) => setShippingOverride(e.target.value)}
            placeholder="0"
            className="flex-1 rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
          />
          <button
            onClick={handleSaveShipping}
            disabled={
              savingShipping ||
              Number(shippingOverride) === order.shipping
            }
            className="rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {savingShipping ? "Saving..." : "Save Shipping"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
            Payment
          </h2>
          {!isFullyPaid && (
            <button
              onClick={handleMarkPaid}
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Mark as Fully Paid
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Order Total
            </p>
            <p className="mt-1 text-xl font-bold text-text-primary">
              {formatBDT(order.total)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Paid
            </p>
            <p className="mt-1 text-xl font-bold text-success">
              {formatBDT(orderPaid)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Due
            </p>
            <p
              className={`mt-1 text-xl font-bold ${
                isFullyPaid ? "text-success" : "text-red-primary"
              }`}
            >
              {formatBDT(orderDue)}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-border-subtle pt-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
            Payment History
          </h3>

          {payments.length === 0 ? (
            <p className="text-xs text-text-muted md:text-sm">
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-[11px] font-bold text-success">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {formatBDT(p.amount)}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {new Date(p.date).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePayment(p.id)}
                    className="text-[11px] font-semibold text-red-primary underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-border-subtle pt-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
            Add Payment
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                Amount (৳)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                Note (optional)
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. cash / bKash"
                className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                onClick={handleAddPayment}
                disabled={addingPayment || !paymentAmount}
                className="w-full rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
              >
                {addingPayment ? "Adding..." : "+ Add Payment"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-lg border-2 border-gold-primary/40 bg-bg-orange p-5 shadow-card-dark">
        <div className="mb-4">
          <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
            Shipping Charges
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Enter charges and toggle "Show to user" to display each to the customer.
            If toggle is OFF, the customer sees the label but a blank value.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border-subtle bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-primary">
                China Local Courier (৳)
              </label>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={showChinaLocalCourier}
                  onChange={(e) => setShowChinaLocalCourier(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-text-secondary">Show to user</span>
              </label>
            </div>
            <input
              type="number"
              value={chinaLocalCourier}
              onChange={(e) => setChinaLocalCourier(e.target.value)}
              placeholder="0"
              className="mt-2 w-full rounded border border-border-subtle bg-bg-input px-3 py-2 text-sm focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-border-subtle bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-primary">
                BD Courier Charge (৳)
              </label>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={showBdCourier}
                  onChange={(e) => setShowBdCourier(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-text-secondary">Show to user</span>
              </label>
            </div>
            <input
              type="number"
              value={bdCourier}
              onChange={(e) => setBdCourier(e.target.value)}
              placeholder="0"
              className="mt-2 w-full rounded border border-border-subtle bg-bg-input px-3 py-2 text-sm focus:border-gold-primary focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-border-subtle bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Shipping Charge (China → BD)
              </label>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={showShippingCharge}
                  onChange={(e) => setShowShippingCharge(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-text-secondary">Show to user</span>
              </label>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={shippingWeightKg}
                  onChange={(e) => setShippingWeightKg(e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-border-subtle bg-bg-input px-3 py-2 text-sm focus:border-gold-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Rate (৳/kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={shippingRatePerKg}
                  onChange={(e) => setShippingRatePerKg(e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-border-subtle bg-bg-input px-3 py-2 text-sm focus:border-gold-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between rounded bg-bg-orange px-3 py-2">
              <span className="text-[11px] font-medium text-text-secondary">
                Calculated shipping charge:
              </span>
              <span className="text-sm font-bold text-red-primary">
                {formatBDT(computedShippingCharge)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border-2 border-gold-primary/40 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Total Extra Charges
              </span>
              <span className="text-lg font-bold text-red-primary">
                {formatBDT(
                  (Number(chinaLocalCourier) || 0) +
                    (Number(bdCourier) || 0) +
                    computedShippingCharge
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveCharges}
            disabled={savingCharges}
            className="rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {savingCharges ? "Saving..." : "Save Charges"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Order Status
        </h2>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-bg-orange px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-primary">
          ● {STATUS_LABELS[status]}
        </div>

        <div className="mb-5 space-y-1">
          {STATUS_ORDER.map((s, i) => {
            const isDone = i < currentStatusIdx;
            const isCurrent = i === currentStatusIdx;
            return (
              <div key={s} className="flex items-center gap-2 text-xs md:text-sm">
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    isDone
                      ? "border-success bg-success text-white"
                      : isCurrent
                      ? "border-gold-primary bg-gold-primary text-white"
                      : "border-border-subtle bg-white"
                  }`}
                >
                  {isDone && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span
                  className={
                    isDone
                      ? "text-success"
                      : isCurrent
                      ? "font-semibold text-gold-primary"
                      : "text-text-muted"
                  }
                >
                  {STATUS_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="flex-1 rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={handleSaveStatus}
            disabled={savingStatus || status === order.status}
            className="rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {savingStatus ? "Saving..." : "Update Status"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
          China Order IDs
        </h2>
        <p className="mb-3 text-xs text-text-muted">
          Add multiple 1688 order IDs (for bulk orders). Customer will NOT see these.
        </p>

        <div className="space-y-2">
          {chinaOrderIds.map((cid, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={cid}
                onChange={(e) => updateChinaId(idx, e.target.value)}
                placeholder={`e.g. CN-A8X9K2 or 12345678${idx > 0 ? ` (${idx + 1})` : ""}`}
                className="flex-1 rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
              />
              {chinaOrderIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChinaId(idx)}
                  aria-label="Remove"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-red-primary/30 text-red-primary transition hover:bg-red-primary hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addChinaId}
            className="rounded-lg border-2 border-dashed border-gold-primary/40 bg-bg-orange px-4 py-2 text-xs font-semibold text-gold-primary transition hover:bg-gold-primary/10"
          >
            + Add another China ID
          </button>
          <button
            onClick={handleSaveChina}
            disabled={savingChina}
            className="ml-auto rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {savingChina ? "Saving..." : "Save All"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
          Admin Notes
        </h2>
        <p className="mb-3 text-xs text-text-muted">
          Internal notes only. Customer will NOT see this.
        </p>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="e.g. customer asked for gift wrap, urgent delivery..."
          rows={3}
          className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes || adminNotes.trim() === (order.adminNotes ?? "")}
            className="rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {savingNotes ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Customer
        </h2>
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <InfoRow label="Name" value={order.address?.name} />
          <InfoRow label="Phone" value={order.address?.phone} />
          <InfoRow label="Address" value={order.address?.address} className="md:col-span-2" />
          <InfoRow label="District" value={order.address?.district} />
          <InfoRow label="Payment" value={order.paymentMethod} />
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
        <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
          Items
        </h2>
        <div className="space-y-3">
          {order.items.map((item, i) => {
            const title = item.title ?? "Product";
            const lineTotal = item.price * item.quantity;
            return (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border-subtle pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-lg">📦</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {title}
                  </p>
                  {/* ✅ Variant now shown */}
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatBDT(item.price)} × {item.quantity}
                    {item.colorLabel ? ` · ${item.colorLabel}` : ""}
                    {item.size ? ` · ${item.size}` : ""}
                    {item.variant ? ` · ${item.variant}` : ""}
                  </p>
                </div>
                <span className="text-sm font-bold text-red-primary">
                  {formatBDT(lineTotal)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-4 text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Subtotal</span>
            <span className="text-text-primary">{formatBDT(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Shipping</span>
            <span className="text-text-primary">{formatBDT(order.shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-border-subtle pt-2">
            <span className="font-semibold text-text-primary">Total</span>
            <span className="text-lg font-bold text-red-primary">
              {formatBDT(order.total)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-text-primary">{value || "—"}</p>
    </div>
  );
}