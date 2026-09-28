"use client";

import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div>
      {/* Premium header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/40 bg-gold-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
              Owner Dashboard
            </div>
            <h1 className="mt-3 font-serif text-2xl font-bold text-text-primary md:text-3xl">
              Welcome back, <span className="gold-text">Owner</span>
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Here's your store overview for this month.
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Today
            </p>
            <p className="text-sm font-semibold text-text-primary">
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Primary stats — revenue focused */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat
          label="Today's Revenue"
          value="৳0"
          sub="0 orders"
          icon="💰"
          accent="red"
        />
        <BigStat
          label="This Week"
          value="৳0"
          sub="0 orders"
          icon="📅"
          accent="gold"
        />
        <BigStat
          label="This Month"
          value="৳0"
          sub="0 orders"
          icon="📈"
          accent="red"
        />
        <BigStat
          label="Total Orders"
          value="0"
          sub="All time"
          icon="🧾"
          accent="gold"
        />
      </div>

      {/* Second row — operations */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmallStat label="Products" value="0" icon="📦" />
        <SmallStat label="Customers" value="0" icon="👥" />
        <SmallStat label="Wishlist Saves" value="0" icon="♡" />
        <SmallStat label="Pending Orders" value="0" icon="⏳" />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-3 font-serif text-lg font-bold text-text-primary">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickAction
            href="/admin-panel/products"
            icon="📦"
            label="Manage Products"
          />
          <QuickAction
            href="/admin-panel/orders"
            icon="🧾"
            label="View Orders"
          />
          <QuickAction
            href="/admin-panel/settings"
            icon="⚙️"
            label="Store Settings"
          />
          <QuickAction
            href="/admin-panel/analytics"
            icon="📈"
            label="Analytics"
          />
        </div>
      </div>

      {/* Revenue chart placeholder */}
      <div className="mt-8 rounded-lg border border-border-subtle bg-white p-6 shadow-card-dark">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-text-primary md:text-lg">
              Revenue This Month
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Daily breakdown — resets on the 1st of every month
            </p>
          </div>
          <span className="rounded-full bg-bg-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-primary">
            Live
          </span>
        </div>
        <div className="flex h-40 items-end gap-1 rounded-lg bg-bg-input p-4">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-gold-primary/30 to-gold-primary/10"
              style={{ height: `${Math.random() * 60 + 10}%` }}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-text-muted">
          Revenue data will populate as orders come in
        </p>
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  accent: "gold" | "red";
}) {
  const accentColor = accent === "gold" ? "text-gold-primary" : "text-red-primary";
  const accentBg = accent === "gold" ? "bg-bg-orange" : "bg-red-primary/10";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-white p-5 shadow-card-dark">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold md:text-3xl ${accentColor}`}>
            {value}
          </p>
          <p className="mt-1 text-[11px] text-text-muted">{sub}</p>
        </div>
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-xl ${accentBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bg-input text-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-text-primary">{value}</p>
        <p className="text-[11px] text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-white p-4 text-center shadow-card-dark transition hover:-translate-y-0.5 hover:border-gold-primary hover:shadow-card-hover"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-orange text-2xl transition group-hover:bg-gold-primary group-hover:text-white">
        {icon}
      </div>
      <span className="text-xs font-semibold text-text-primary group-hover:text-gold-primary">
        {label}
      </span>
    </Link>
  );
}