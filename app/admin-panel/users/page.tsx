"use client";

import { useState, useEffect } from "react";
import {
  getAllUsers,
  giveCoupon,
  filterValidCoupons,
  type AdminUser,
  type Coupon,
} from "@/lib/coupons";
import { formatBDT } from "@/lib/adminOrders";
import UserOrdersModal from "@/components/UserOrdersModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openGiveFor, setOpenGiveFor] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // ✅ NEW — password reset state
  const [openResetFor, setOpenResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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
    if (amount <= 0) {
      alert("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await giveCoupon(uid, amount);
      showToast(`Coupon ৳${amount} given!`);
      setOpenGiveFor(null);
      setAmount(100);
      await loadUsers();
    } catch (err) {
      console.error(err);
      showToast("Failed to give coupon");
    } finally {
      setSaving(false);
    }
  };

  // ✅ NEW — reset password via API
  const handleResetPassword = async (user: AdminUser) => {
    if (!newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    if (!user.phone) {
      setResetError("This user has no phone number on file");
      return;
    }

    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/admin/set-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: user.phone, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResetError(data.error || "Failed to reset password");
        return;
      }

      showToast(`✅ Password reset for ${data.phone}`);
      setNewPassword("");
      setOpenResetFor(null);
    } catch (err: any) {
      setResetError(err.message || "Something went wrong");
    } finally {
      setResetting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const phone = (u.phone ?? "").toLowerCase();
    const name = (u.name ?? "").toLowerCase();
    const email = (u.email ?? "").toLowerCase();
    const address = (u.savedAddress?.address ?? "").toLowerCase();
    return (
      phone.includes(q) ||
      name.includes(q) ||
      email.includes(q) ||
      address.includes(q)
    );
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
          Click a user to view their orders and outstanding dues.
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or address..."
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
            const isResetting = openResetFor === u.uid;
            const displayName = u.name || "Unnamed User";
            const hasAddress = u.savedAddress?.address;

            return (
              <div
                key={u.uid}
                className="rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-80"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-bg-orange text-xl">
                      👤
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary md:text-base">
                        {displayName}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary md:text-sm">
                        {u.phone || "No phone"}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-text-muted md:text-[11px]">
                        {u.uid}
                      </p>

                      {hasAddress && (
                        <p className="mt-1 truncate text-[11px] text-text-muted md:text-xs">
                          📍 {u.savedAddress?.address}
                          {u.savedAddress?.district
                            ? `, ${u.savedAddress.district}`
                            : ""}
                        </p>
                      )}

                      {valid.length > 0 && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-bg-orange px-2 py-0.5 text-[10px] font-bold text-gold-primary">
                          🎟️ {valid.length} active coupon
                          {valid.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="rounded-lg border-2 border-gold-primary bg-white px-3 py-2 text-xs font-semibold text-gold-primary transition hover:bg-bg-orange md:px-4 md:text-sm"
                    >
                      📋 View Orders
                    </button>
                    <button
                      onClick={() => setOpenGiveFor(isOpen ? null : u.uid)}
                      className="rounded-lg border-2 border-gold-primary bg-white px-3 py-2 text-xs font-semibold text-gold-primary transition hover:bg-bg-orange md:px-4 md:text-sm"
                    >
                      🎁 Give Coupon
                    </button>
                    {/* ✅ NEW — Reset Password button */}
                    <button
                      onClick={() => {
                        setOpenResetFor(isResetting ? null : u.uid);
                        setNewPassword("");
                        setResetError(null);
                      }}
                      className="rounded-lg border-2 border-red-primary bg-white px-3 py-2 text-xs font-semibold text-red-primary transition hover:bg-red-primary/5 md:px-4 md:text-sm"
                    >
                      🔑 Reset Password
                    </button>
                  </div>
                </div>

                {/* Coupon section (existing) */}
                {isOpen && (
                  <div className="mt-4 border-t border-border-subtle pt-4">
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                      Discount Amount (৳)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value) || 0)}
                        className="w-32 rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
                      />
                      <span className="self-center text-sm text-text-muted">৳</span>
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
                              {formatBDT(c.amount)} OFF
                            </span>
                            <span className="text-text-muted">
                              exp{" "}
                              {new Date(c.expiresAt).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ NEW — Reset password section */}
                {isResetting && (
                  <div className="mt-4 border-t border-red-primary/30 pt-4">
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary md:text-xs">
                      New Password (min 6 characters)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="flex-1 rounded-lg border border-border-subtle bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-gold-primary focus:outline-none"
                      />
                      <button
                        onClick={() => handleResetPassword(u)}
                        disabled={resetting || newPassword.length < 6}
                        className="rounded-lg bg-red-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                      >
                        {resetting ? "Setting..." : "Set Password"}
                      </button>
                    </div>
                    {resetError && (
                      <p className="mt-2 text-[11px] text-red-primary">
                        ❌ {resetError}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-text-muted">
                      Tell this new password to the customer. They log in with
                      phone + password.
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <UserOrdersModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}