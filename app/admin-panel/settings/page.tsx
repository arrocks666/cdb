"use client";

import { useState, useEffect } from "react";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/firestoreSettings";
import { DEFAULT_PRICING } from "@/lib/pricing";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Password change
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
        deliveryInfo: settings.deliveryInfo,
        howToOrder: settings.howToOrder,
        contactPhone: settings.contactPhone,
        contactEmail: settings.contactEmail,
        contactAddress: settings.contactAddress,
        whatsappNumber: settings.whatsappNumber,
      });
      showToast("Settings saved");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to save settings");
    } finally {
      setSaving(false);
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

      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
          Settings
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Store Settings
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Control pricing, product page content, and admin access.
        </p>
      </div>

      <div className="space-y-5">
        {/* Currency & Pricing */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Currency Conversion
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Used to compute product prices from 1688 (CNY → USD → BDT).
            Only affects new/edited products unless you click "Recalculate".
          </p>

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

          <div className="mt-4 rounded-lg border border-border-subtle bg-bg-input p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Example
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              ¥100 CNY → ${(100 * settings.cnyToUsd).toFixed(2)} → ৳
              {Math.round(100 * settings.cnyToUsd * settings.usdToBdt)}
            </p>
          </div>
        </section>

        {/* Markup tiers (read-only) */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Markup Tiers
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Applied on top of the converted BDT cost. Editable in a later update.
          </p>

          <div className="overflow-hidden rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="bg-bg-input">
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2">Cost Range</th>
                  <th className="px-3 py-2 text-right">Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_PRICING.tiers.map((t) => (
                  <tr
                    key={t.label}
                    className="border-t border-border-subtle"
                  >
                    <td className="px-3 py-2 text-text-primary">{t.label}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gold-primary">
                      ×{t.multiplier.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Product page content */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Product Page Content
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            These appear under the description on every product page.
          </p>

          <div className="space-y-3">
            <TextArea
              label="Return Policy"
              value={settings.returnPolicy}
              onChange={(v) => update("returnPolicy", v)}
              rows={3}
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

        {/* Contact + WhatsApp */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-4 font-serif text-base font-bold text-text-primary md:text-lg">
            Contact & WhatsApp
          </h2>

          <div className="space-y-3">
            <TextField
              label="Contact Phone"
              value={settings.contactPhone}
              onChange={(v) => update("contactPhone", v)}
            />
            <TextField
              label="Contact Email"
              value={settings.contactEmail}
              onChange={(v) => update("contactEmail", v)}
            />
            <TextField
              label="Contact Address"
              value={settings.contactAddress}
              onChange={(v) => update("contactAddress", v)}
            />
            <TextField
              label="WhatsApp Number (digits only, e.g. 8801XXXXXXXXX)"
              value={settings.whatsappNumber}
              onChange={(v) => update("whatsappNumber", v)}
            />
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gold-primary px-6 py-3 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Password */}
        <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
          <h2 className="mb-1 font-serif text-base font-bold text-text-primary md:text-lg">
            Change Admin Password
          </h2>
          <p className="mb-4 text-xs text-text-muted">
            Username stays <span className="font-mono font-semibold">cdb</span>.
            Password is stored securely (hashed) in Firestore.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <TextField
              label="Current Password"
              value={oldPass}
              onChange={setOldPass}
              type="password"
            />
            <TextField
              label="New Password (min 6 chars)"
              value={newPass}
              onChange={setNewPass}
              type="password"
            />
            <TextField
              label="Confirm New Password"
              value={confirmPass}
              onChange={setConfirmPass}
              type="password"
            />

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        className="w-full rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
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