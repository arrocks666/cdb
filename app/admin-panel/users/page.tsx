"use client";

import { useState, useEffect } from "react";
import {
  getAllUsers,
  giveCoupon,
  filterValidCoupons,
  type AdminUser,
  type Coupon,
} from "@/lib/coupons";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openGiveFor, setOpenGiveFor] = useState<string | null>(null);
  const [percent, setPercent] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleGive = async (uid: string) => {
    if (percent <= 0 || percent > 100) {
      alert("Enter a valid percent (1-100)");
      return;
    }
    setSaving(true);
    try {
      await giveCoupon(uid, percent);
      showToast(`Coupon ${percent}% given!`);
      setOpenGiveFor(null);
      setPercent(10);
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast("Failed to give coupon");
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const phone = (u.phone ?? "").toLowerCase();
    const name = (u.name ?? "").toLowerCase();
    return phone.includes(q) || name.includes(q);
  });

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
          Users
        </div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
          Manage Users
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Give discount coupons to specific customers.
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by phone or name..."
          className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none md:max-w-md"
        />
      </div>

      <p className="mb-3 text-xs text-text-muted">
        <span className="font-bold text-text-primary">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "user" : "users"}
      </p>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-white p-10 text-center shadow-card-dark">
            <div className="text-5xl opacity-40">👥</div>
            <h3 className="mt-3 font-serif text-base font-bold text-text-primary md:text-lg">
              No users found
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {search ? `Nothing matches "${search}"` : "No users registered yet"}
            </p>
          </div>
        ) : (
          filtered.map((u) => {
            const valid = filterValidCoupons(u.coupons ?? []);
            const isOpen = openGiveFor === u.uid;

            return (
              <div
                key={u.uid}
                className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-bg-orange text-xl">
                    👤
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary md:text-base">
                      {u.name || u.phone || "Unknown User"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
                      {u.phone && u.name ? u.phone : u.uid.slice(0, 12)}
                    </p>
                    {valid.length > 0 && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-bg-orange px-2 py-0.5 text-[10px] font-bold text-gold-primary">
                        🎟️ {valid.length} active coupon{valid.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setOpenGiveFor(isOpen ? null : u.uid)}
                    className="rounded-lg border-2 border-gold-primary bg-white px-4 py-2 text-xs font-semibold text-gold-primary transition hover:bg-bg-orange md:text-sm"
                  >
                    🎁 Give Coupon
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 border-t border-border-subtle pt-4">
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                      Discount Percent
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={percent}
                        onChange={(e) => setPercent(Number(e.target.value) || 0)}
                        className="w-32 rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
                      />
                      <span className="self-center text-sm text-text-muted">%</span>
                      <button
                        onClick={() => handleGive(u.uid)}
                        disabled={saving}
                        className="ml-auto rounded-lg bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury disabled:opacity-40"
                      >
                        {saving ? "Sending..." : "Send Coupon"}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-text-muted">
                      Valid for 30 days. One-time use.
                    </p>

                    {valid.length > 0 && (
                      <div className="mt-4 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Active Coupons
                        </p>
                        {valid.map((c: Coupon) => (
                          <div
                            key={c.code}
                            className="flex items-center justify-between rounded border border-border-subtle bg-bg-input px-3 py-2 text-xs"
                          >
                            <span className="font-mono font-semibold text-gold-primary">
                              {c.code}
                            </span>
                            <span className="text-text-primary">
                              {c.percent}% off
                            </span>
                            <span className="text-text-muted">
                              exp {new Date(c.expiresAt).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}