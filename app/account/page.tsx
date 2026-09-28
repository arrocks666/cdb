"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

type MenuItem = { icon: string; title: string; href?: string };

const menuItems: MenuItem[] = [
  { icon: "📦", title: "My Orders", href: "/orders" },
  { icon: "♡", title: "Wishlist", href: "/wishlist" },
  { icon: "📍", title: "My Addresses" },
  { icon: "💳", title: "Payment Methods" },
  { icon: "🎟️", title: "Coupons & Offers" },
  { icon: "❓", title: "Help & Support", href: "/help" },
  { icon: "⚙️", title: "Settings" },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    await logout();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    // Show ONLY:
    // - profile.phone (real phone from Firestore)
    // - user.displayName (we set this to phone at signup)
    // - NEVER user.email (that's the fake email)
    const phone = profile?.phone || user.displayName || "Customer";

    // Show real email only if user provided one at signup and it's saved in Firestore
    const emailToShow =
      profile?.email && profile.email.trim() !== "" ? profile.email.trim() : null;

    return (
      <div className="min-h-screen bg-bg-secondary">
        <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
          <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
            <button onClick={() => router.push("/")} aria-label="Menu" className="flex h-8 w-8 items-center justify-center text-text-primary hover:text-gold-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            </button>
            <h1 className="flex-1 text-lg font-bold leading-none text-text-primary md:text-xl">Account</h1>
            {isAdmin && (
              <Link href="/admin" className="rounded-full bg-red-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-red-glow md:text-xs">
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-4 md:py-6">
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-gold-primary bg-bg-orange text-2xl text-gold-primary md:h-20 md:w-20 md:text-3xl">
                👤
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-text-primary md:text-xl">
                  {phone}
                </h2>
                {emailToShow && (
                  <p className="mt-0.5 truncate text-[11px] text-text-muted md:text-sm">
                    {emailToShow}
                  </p>
                )}
                <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold-primary/50 bg-bg-orange px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-primary md:text-xs">
                  <span>⭐</span>
                  {isAdmin ? "Admin" : "Member"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 md:gap-3">
            <StatBox label="Orders" value="0" />
            <StatBox label="Wishlist" value="0" />
            <StatBox label="Coupons" value="0" />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border-subtle bg-white shadow-card-dark">
            {menuItems.map((item, i) => {
              const Row = (
                <div className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-bg-input ${i > 0 ? "border-t border-border-subtle" : ""}`}>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-input text-base md:text-lg">{item.icon}</div>
                  <span className="flex-1 text-sm font-medium text-text-primary md:text-base">{item.title}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-gold-primary"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              );
              return item.href ? (
                <Link key={item.title} href={item.href}>{Row}</Link>
              ) : (
                <button key={item.title} onClick={() => alert(`${item.title} coming soon!`)} className="block w-full text-left">{Row}</button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-text-muted md:text-xs">
            <a href="#" className="transition hover:text-gold-primary">Privacy Policy</a>
            <span>|</span>
            <a href="#" className="transition hover:text-gold-primary">Terms & Conditions</a>
            <span>|</span>
            <a href="#" className="transition hover:text-gold-primary">Shipping Policy</a>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-primary/40 bg-red-primary/5 py-3 text-sm font-semibold text-red-primary transition hover:bg-red-primary hover:text-white md:text-base"
          >
            Logout
          </button>

          <p className="mt-6 text-center text-[10px] text-text-muted md:text-xs">
            ChinaDailyBazar v0.1.0 • Made for Bangladesh 🇧🇩
          </p>
        </div>
      </div>
    );
  }

  // Guest view
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/")} aria-label="Menu" className="flex h-8 w-8 items-center justify-center text-text-primary hover:text-gold-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>
          <h1 className="flex-1 text-lg font-bold leading-none text-text-primary md:text-xl">Account</h1>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-4 md:py-6">
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark md:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-border-subtle bg-bg-input text-2xl text-text-muted md:h-20 md:w-20 md:text-3xl">
              👤
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-text-primary md:text-xl">Welcome, Guest</h2>
              <p className="mt-0.5 text-[11px] text-text-muted md:text-sm">
                Login to access your orders, wishlist, and more
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/login" className="rounded-lg bg-gold-primary py-3 text-center text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury">
              Login
            </Link>
            <Link href="/signup" className="rounded-lg border-2 border-gold-primary bg-white py-3 text-center text-sm font-semibold text-gold-primary transition hover:bg-bg-orange">
              Sign Up
            </Link>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border-subtle bg-white shadow-card-dark">
          {menuItems.map((item, i) => {
            const Row = (
              <div className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-bg-input ${i > 0 ? "border-t border-border-subtle" : ""}`}>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-input text-base md:text-lg">{item.icon}</div>
                <span className="flex-1 text-sm font-medium text-text-primary md:text-base">{item.title}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-gold-primary"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            );
            return item.href ? (
              <Link key={item.title} href={item.href}>{Row}</Link>
            ) : (
              <button key={item.title} onClick={() => alert(`${item.title} coming soon!`)} className="block w-full text-left">{Row}</button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[10px] text-text-muted md:text-xs">
          ChinaDailyBazar v0.1.0 • Made for Bangladesh 🇧🇩
        </p>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white px-3 py-2.5 text-center shadow-card-dark">
      <div className="text-lg font-bold text-gold-primary md:text-xl">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-muted md:text-xs">{label}</div>
    </div>
  );
}