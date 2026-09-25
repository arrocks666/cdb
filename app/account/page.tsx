"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type MenuItem = {
  icon: string;
  title: string;
  href?: string;
};

const menuItems: MenuItem[] = [
  { icon: "📦", title: "My Orders", href: "/orders" },
  { icon: "♡", title: "Wishlist", href: "/wishlist" },
  { icon: "📍", title: "My Addresses" },
  { icon: "💳", title: "Payment Methods" },
  { icon: "🎟️", title: "Coupons & Offers" },
  { icon: "🔔", title: "Notifications" },
  { icon: "❓", title: "Help & Support", href: "/help" },
  { icon: "⚙️", title: "Settings" },
];

export default function AccountPage() {
  const router = useRouter();

  return (
    <div>
      {/* Top bar */}
      <div className="sticky top-[100px] z-40 border-b border-border-subtle bg-bg-base/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/")}
            aria-label="Menu"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>

          <h1 className="flex-1 font-serif text-lg font-bold leading-none md:text-xl">
            <span className="gold-text">Account</span>
          </h1>

          <button
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center text-gold-primary transition hover:text-gold-luxury"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
        {/* Profile Card */}
        <div className="relative overflow-hidden rounded-2xl border border-gold-primary/40 bg-gradient-to-br from-red-dark/20 via-bg-card to-bg-card p-4 shadow-card-dark md:p-6">
          {/* Subtle gold decorative circle */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gold-primary/10 blur-2xl"
          />

          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-gold-primary bg-bg-card-elevated text-2xl text-gold-primary md:h-20 md:w-20 md:text-3xl">
              👤
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-serif text-base font-bold text-text-primary md:text-xl">
                Rahat Islam
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-text-muted md:text-sm">
                rahatislam@gmail.com
              </p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-gold-primary/50 bg-gold-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-primary md:text-xs">
                <span>⭐</span>
                Gold Member
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2 md:gap-3">
          <StatBox label="Orders" value="12" />
          <StatBox label="Wishlist" value="6" />
          <StatBox label="Coupons" value="3" />
        </div>

        {/* Menu list */}
        <div className="mt-4 overflow-hidden rounded-xl border border-gold-primary/40 bg-bg-card shadow-card-dark">
          {menuItems.map((item, i) => {
            const Row = (
              <div
                className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-bg-card-elevated ${
                  i > 0 ? "border-t border-border-subtle" : ""
                }`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gold-primary/30 bg-bg-card-elevated text-base md:text-lg">
                  {item.icon}
                </div>

                <span className="flex-1 text-sm font-medium text-text-primary md:text-base">
                  {item.title}
                </span>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 text-gold-primary transition group-hover:translate-x-0.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );

            return item.href ? (
              <Link key={item.title} href={item.href}>
                {Row}
              </Link>
            ) : (
              <button
                key={item.title}
                onClick={() => alert(`${item.title} coming soon!`)}
                className="block w-full text-left"
              >
                {Row}
              </button>
            );
          })}
        </div>

        {/* Legal links */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-text-muted md:text-xs">
          <a href="#" className="transition hover:text-gold-primary">
            Privacy Policy
          </a>
          <span className="text-border-subtle">|</span>
          <a href="#" className="transition hover:text-gold-primary">
            Terms & Conditions
          </a>
          <span className="text-border-subtle">|</span>
          <a href="#" className="transition hover:text-gold-primary">
            Shipping Policy
          </a>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            if (confirm("Are you sure you want to logout?")) {
              alert("Logout coming soon!");
            }
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-primary/60 bg-red-primary/10 py-3 text-sm font-semibold text-red-primary transition hover:bg-red-primary hover:text-white md:text-base"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>

        {/* App version */}
        <p className="mt-6 text-center text-[10px] text-text-disabled md:text-xs">
          ChinaDailyBazar v0.1.0 • Made for Bangladesh 🇧🇩
        </p>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gold-primary/40 bg-bg-card px-3 py-2.5 text-center shadow-card-dark">
      <div className="text-lg font-bold text-red-primary md:text-xl">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-muted md:text-xs">
        {label}
      </div>
    </div>
  );
}