"use client";

import { useState, useEffect } from "react";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  DEFAULT_MARKUP_TIERS,
  DEFAULT_FAQS,
  type StoreSettings,
  type MarkupTier,
  type FaqItem,
} from "@/lib/firestoreSettings";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof StoreSettings>(
    key: K,
    value: StoreSettings[K]
  ) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        cnyToUsd: settings.cnyToUsd,
        usdToBdt: settings.usdToBdt,
        returnPolicy: settings.returnPolicy,
        termsPolicy: settings.termsPolicy,
        deliveryInfo: settings.deliveryInfo,
        howToOrder: settings.howToOrder,
        faqItems: settings.faqItems,
        contactPhone: settings.contactPhone,
        contactEmail: settings.contactEmail,
        contactAddressBD: settings.contactAddressBD,
        contactAddressCN: settings.contactAddressCN,
        ownerName: settings.ownerName,
        whatsappNumber: settings.whatsappNumber,
        whatsappNumber2: settings.whatsappNumber2,
        facebookUrl: settings.facebookUrl,
        instagramUrl: settings.instagramUrl,
        footerDescription: settings.footerDescription,
        byAirRate1: settings.byAirRate1,
        byAirRate2: settings.byAirRate2,
        byAirDays: settings.byAirDays,
        bySeaRate: settings.bySeaRate,
        bySeaDays: settings.bySeaDays,
        showByAirOnProductPage: settings.showByAirOnProductPage,
        showBySeaOnProductPage: settings.showBySeaOnProductPage,
        payNowPercent: settings.payNowPercent,
        defaultWeightKg: settings.defaultWeightKg,
        shippingWarning: settings.shippingWarning,
        shippingCharge: settings.shippingCharge,
        bkashNumber: settings.bkashNumber,
        nagadNumber: settings.nagadNumber,
        bankName: settings.bankName,
        bankAccountNumber: settings.bankAccountNumber,
        bankAccountHolder: settings.bankAccountHolder,
        logoUrl: settings.logoUrl,
        markupTiers: settings.markupTiers,
        shippingDetailsBangla: settings.shippingDetailsBangla,
      });
      showToast("Settings saved");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert("Logo must be under 30MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const { resizeImage } = await import("@/lib/resizeImage");
      const resized = await resizeImage(file, 512, 0.85);
      const fd = new FormData();
      fd.append("image", resized);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      update("logoUrl", data.url);
      showToast("Logo uploaded — click Save Settings");
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);
    if (newPass.length < 6) {
      setPassError("New password must be at least 6 characters");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("New passwords do not match");
      return;
    }
    setChangingPass(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassError(data.error || "Failed to change password");
      } else {
        setPassSuccess(true);
        setOldPass("");
        setNewPass("");
        setConfirmPass("");
        showToast("Password updated");
      }
    } catch (err: any) {
      console.error(err);
      setPassError("Failed to change password");
    } finally {
      setChangingPass(false);
    }
  };

  const addTier = () => {
    const newTier: MarkupTier = {
      id: `tier-${Date.now()}`,
      min: 0,
      max: 500,
      multiplier: 1.5,
    };
    update("markupTiers", [...settings.markupTiers, newTier]);
  };

  const updateTier = (id: string, patch: Partial<MarkupTier>) => {
    update(
      "markupTiers",
      settings.markupTiers.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const removeTier = (id: string) => {
    if (settings.markupTiers.length <= 1) {
      alert("You must have at least one tier");
      return;
    }
    update(
      "markupTiers",
      settings.markupTiers.filter((t) => t.id !== id)
    );
  };

  const resetTiers = () => {
    if (!confirm("Reset markup tiers to default?")) return;
    update("markupTiers", DEFAULT_MARKUP_TIERS);
  };

  const addFaq = () => {
    if (settings.faqItems.length >= 10) {
      alert("Maximum 10 FAQs allowed");
      return;
    }
    const newFaq: FaqItem = {
      id: `faq-${Date.now()}`,
      q: "",
      a: "",
    };
    update("faqItems", [...settings.faqItems, newFaq]);
  };

  const updateFaq = (id: string, patch: Partial<FaqItem>) => {
    update(
      "faqItems",
      settings.faqItems.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const removeFaq = (id: string) => {
    if (!confirm("Remove this FAQ?")) return;
    update(
      "faqItems",
      settings.faqItems.filter((f) => f.id !== id)
    );
  };

  const resetFaqs = () => {
    if (!confirm("Reset FAQs to default 10?")) return;
    update("faqItems", DEFAULT_FAQS);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-text-primary px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
          Settings
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Store Settings
        </h1>
      </div>

      <div className="space-y-5">
        {/* LOGO */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Store Logo
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Upload any square logo (any size — up to 30MB). It will be auto-compressed to a 512×512 icon before upload.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-bg-input">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="logo"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-md bg-gold-primary text-2xl font-bold text-white">
                  买
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                id="logo-upload"
                className="hidden"
              />
              <label
                htmlFor="logo-upload"
                className="inline-block cursor-pointer rounded-lg border-2 border-gold-primary bg-white px-4 py-2 text-sm font-semibold text-gold-primary transition hover:bg-bg-orange"
              >
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </label>
              {settings.logoUrl && (
                <button
                  onClick={() => update("logoUrl", "")}
                  className="ml-2 text-xs font-semibold text-red-primary underline"
                >
                  Remove
                </button>
              )}
              <p className="mt-2 text-[11px] text-text-muted">
                Or leave empty to use the default 买 icon.
              </p>
            </div>
          </div>
        </section>

        {/* GLOBAL SHIPPING CHARGE */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Global Shipping Charge
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Flat shipping charge shown at cart, checkout, and order pages. Set to <strong>0</strong> to show "Free Shipping" everywhere.
          </p>
          <NumField
            label="Shipping Charge (৳)"
            value={settings.shippingCharge}
            onChange={(v) => update("shippingCharge", v)}
          />
          {settings.shippingCharge === 0 && (
            <p className="mt-2 text-[11px] font-semibold text-success">
              ✓ Currently set to FREE — customers will see ৳0 shipping.
            </p>
          )}
        </section>

        {/* MARKUP TIERS */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
                Markup Tiers
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Multiplier applied on top of the BDT cost.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetTiers}
                className="rounded-lg border border-border-subtle bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-red-primary hover:text-red-primary"
              >
                Reset
              </button>
              <button
                onClick={addTier}
                className="rounded-lg bg-gold-primary px-3 py-1.5 text-xs font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
              >
                + Add Tier
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {settings.markupTiers.map((tier) => (
              <div
                key={tier.id}
                className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border-subtle bg-bg-input p-3"
              >
                <div className="col-span-4">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Min (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tier.min}
                    onChange={(e) =>
                      updateTier(tier.id, { min: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Max (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tier.max}
                    onChange={(e) =>
                      updateTier(tier.id, { max: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    ×Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tier.multiplier}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        multiplier: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded border border-border-subtle bg-white px-2.5 py-2 text-sm focus:border-gold-primary focus:outline-none"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeTier(tier.id)}
                    className="flex h-9 w-9 items-center justify-center rounded border border-red-primary/30 text-red-primary transition hover:bg-red-primary hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CURRENCY */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Currency Conversion
          </h2>
          <p className="mb-4 text-xs text-text-muted">CNY → USD → BDT.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NumField
              label="CNY → USD rate"
              value={settings.cnyToUsd}
              onChange={(v) => update("cnyToUsd", v)}
              step="0.001"
            />
            <NumField
              label="USD → BDT rate"
              value={settings.usdToBdt}
              onChange={(v) => update("usdToBdt", v)}
              step="0.01"
            />
          </div>
        </section>

        {/* SHIPPING METHOD & PAYMENT */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Shipping Method & Payment
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            By Air / By Sea details, visibility, and payment split.
          </p>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gold-primary">
                  ✈️ By Air
                </p>
                <label className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={settings.showByAirOnProductPage}
                    onChange={(e) =>
                      update("showByAirOnProductPage", e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-text-secondary">Show on product page</span>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <NumField
                  label="Rate 1 (৳/kg)"
                  value={settings.byAirRate1}
                  onChange={(v) => update("byAirRate1", v)}
                />
                <NumField
                  label="Rate 2 (৳/kg)"
                  value={settings.byAirRate2}
                  onChange={(v) => update("byAirRate2", v)}
                />
                <TextField
                  label="Delivery Days"
                  value={settings.byAirDays}
                  onChange={(v) => update("byAirDays", v)}
                  placeholder="12 - 20"
                />
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gold-primary">
                  🚢 By Sea
                </p>
                <label className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={settings.showBySeaOnProductPage}
                    onChange={(e) =>
                      update("showBySeaOnProductPage", e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-text-secondary">Show on product page</span>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <NumField
                  label="Rate (৳/kg থেকে শুরু)"
                  value={settings.bySeaRate}
                  onChange={(v) => update("bySeaRate", v)}
                />
                <TextField
                  label="Delivery Days"
                  value={settings.bySeaDays}
                  onChange={(v) => update("bySeaDays", v)}
                  placeholder="30 - 45"
                />
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gold-primary">
                Payment Split
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <NumField
                  label="Pay Now % (default 70)"
                  value={settings.payNowPercent}
                  onChange={(v) => update("payNowPercent", v)}
                />
                <NumField
                  label="Default Weight (kg)"
                  value={settings.defaultWeightKg}
                  onChange={(v) => update("defaultWeightKg", v)}
                  step="0.1"
                />
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <TextArea
                label="Shipping Warning Text (shows in red)"
                value={settings.shippingWarning}
                onChange={(v) => update("shippingWarning", v)}
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* PRODUCT PAGE CONTENT */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Product Page Content
          </h2>
          <div className="space-y-3">
            <TextArea
              label="Return Policy (shows on product + help page)"
              value={settings.returnPolicy}
              onChange={(v) => update("returnPolicy", v)}
              rows={3}
            />
            <TextArea
              label="Terms & Conditions (shows on help page)"
              value={settings.termsPolicy}
              onChange={(v) => update("termsPolicy", v)}
              rows={5}
            />
            <TextArea
              label="Delivery Info"
              value={settings.deliveryInfo}
              onChange={(v) => update("deliveryInfo", v)}
              rows={3}
            />
            <TextArea
              label="How to Order"
              value={settings.howToOrder}
              onChange={(v) => update("howToOrder", v)}
              rows={5}
            />
          </div>
        </section>

        {/* FAQ EDITOR */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-bold text-text-primary md:text-lg">
                FAQ ({settings.faqItems.length}/10)
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                These appear on the Help page. Max 10.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetFaqs}
                className="rounded-lg border border-border-subtle bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-red-primary hover:text-red-primary"
              >
                Reset
              </button>
              <button
                onClick={addFaq}
                disabled={settings.faqItems.length >= 10}
                className="rounded-lg bg-gold-primary px-3 py-1.5 text-xs font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
              >
                + Add FAQ
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {settings.faqItems.map((faq, idx) => (
              <div
                key={faq.id}
                className="rounded-lg border border-border-subtle bg-bg-input p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    FAQ {idx + 1}
                  </span>
                  <button
                    onClick={() => removeFaq(faq.id)}
                    className="text-[11px] font-semibold text-red-primary underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={faq.q}
                  onChange={(e) => updateFaq(faq.id, { q: e.target.value })}
                  placeholder="Question"
                  className="mb-2 w-full rounded border border-border-subtle bg-white px-3 py-2 text-sm focus:border-gold-primary focus:outline-none"
                />
                <textarea
                  value={faq.a}
                  onChange={(e) => updateFaq(faq.id, { a: e.target.value })}
                  placeholder="Answer"
                  rows={2}
                  className="w-full resize-none rounded border border-border-subtle bg-white px-3 py-2 text-sm focus:border-gold-primary focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER CONTENT */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Footer Content
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Shown at the bottom of every customer-facing page.
          </p>
          <div className="space-y-3">
            <TextField
              label="Owner / Business Name"
              value={settings.ownerName}
              onChange={(v) => update("ownerName", v)}
              placeholder="e.g. Md. Rahim Uddin"
            />
            <TextArea
              label="Footer Description"
              value={settings.footerDescription}
              onChange={(v) => update("footerDescription", v)}
              rows={4}
            />
            <TextField
              label="Facebook Page URL"
              value={settings.facebookUrl}
              onChange={(v) => update("facebookUrl", v)}
              placeholder="https://facebook.com/yourpage"
            />
            <TextField
              label="Instagram Profile URL"
              value={settings.instagramUrl}
              onChange={(v) => update("instagramUrl", v)}
              placeholder="https://instagram.com/yourprofile"
            />
          </div>
        </section>

        {/* SHIPPING DETAILS */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Shipping Details (বিস্তারিত)
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Shown when customer clicks "বিস্তারিত" on a product page. Leave empty to use the default text.
          </p>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
              Shipping Details Text (Bangla)
            </label>
            <textarea
              value={settings.shippingDetailsBangla ?? ""}
              onChange={(e) => update("shippingDetailsBangla", e.target.value)}
              rows={14}
              placeholder="ক্যাটাগরিঃ এ - ৮০০টাকা প্রতি কেজি
...

(Leave empty to use default)"
              className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
            />
          </div>
        </section>

        {/* CONTACT + WHATSAPP */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Contact & WhatsApp
          </h2>
          <div className="space-y-3">
            <TextField label="Contact Phone" value={settings.contactPhone} onChange={(v) => update("contactPhone", v)} />
            <TextField label="Contact Email" value={settings.contactEmail} onChange={(v) => update("contactEmail", v)} />
            <TextField label="Bangladesh Address" value={settings.contactAddressBD} onChange={(v) => update("contactAddressBD", v)} placeholder="e.g. Dhaka, Bangladesh" />
            <TextField label="China Address" value={settings.contactAddressCN} onChange={(v) => update("contactAddressCN", v)} placeholder="e.g. Guangzhou, China" />
            <TextField label="WhatsApp Number 1 (digits only)" value={settings.whatsappNumber} onChange={(v) => update("whatsappNumber", v)} />
            <TextField label="WhatsApp Number 2 (digits only)" value={settings.whatsappNumber2} onChange={(v) => update("whatsappNumber2", v)} />
          </div>
        </section>

        {/* PAYMENT NUMBERS */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Payment Numbers
          </h2>
          <div className="space-y-3">
            <TextField label="bKash Number" value={settings.bkashNumber} onChange={(v) => update("bkashNumber", v)} placeholder="01711-111111" />
            <TextField label="Nagad Number" value={settings.nagadNumber} onChange={(v) => update("nagadNumber", v)} placeholder="01811-111111" />
            <TextField label="Bank Name" value={settings.bankName} onChange={(v) => update("bankName", v)} placeholder="Dutch Bangla Bank" />
            <TextField label="Bank Account Number" value={settings.bankAccountNumber} onChange={(v) => update("bankAccountNumber", v)} placeholder="1234567890123" />
            <TextField label="Bank Account Holder" value={settings.bankAccountHolder} onChange={(v) => update("bankAccountHolder", v)} placeholder="ChinaDailyBazar" />
          </div>
        </section>

        {/* SAVE */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gold-primary px-6 py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* PASSWORD */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Change Admin Password
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Username stays <span className="font-mono font-semibold">cdb</span>.
          </p>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <TextField label="Current Password" value={oldPass} onChange={setOldPass} type="password" />
            <TextField label="New Password (min 6 chars)" value={newPass} onChange={setNewPass} type="password" />
            <TextField label="Confirm New Password" value={confirmPass} onChange={setConfirmPass} type="password" />
            {passError && (
              <div className="rounded-lg border border-red-primary/30 bg-red-primary/5 px-3 py-2 text-xs text-red-primary">
                {passError}
              </div>
            )}
            {passSuccess && (
              <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                Password updated successfully
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPass}
                className="rounded-lg border-2 border-red-primary bg-white px-6 py-2.5 text-sm font-semibold text-red-primary transition hover:bg-red-primary hover:text-white disabled:opacity-40"
              >
                {changingPass ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
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

function NumField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
        {label}
      </label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-none rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
      />
    </div>
  );
}