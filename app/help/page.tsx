"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const faqs = [
  {
    q: "How do I place an order?",
    a: "Browse products, tap 'Add to Cart' on items you like, then go to your cart and tap 'Proceed to Checkout'. Follow the 3 steps: address, payment, and confirm.",
  },
  {
    q: "How long does shipping take?",
    a: "Delivery from China to Bangladesh typically takes 7–15 business days. Some items may take longer depending on location and customs.",
  },
  {
    q: "How can I track my order?",
    a: "Go to Account → My Orders, and tap on any order to see its live tracking timeline.",
  },
  {
    q: "How do I cancel an order?",
    a: "You can cancel before the order is processed. Go to My Orders, tap the order, and use the cancel option. Once shipped, cancellation is not possible.",
  },
  {
    q: "How do refunds work?",
    a: "If your item is defective or doesn't match the description, request a return within 7 days. Refunds go to your bKash/Nagad within 3–5 business days.",
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = faqs.filter((f) =>
    f.q.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Top bar */}
      <div className="sticky top-[100px] z-40 border-b border-border-subtle bg-bg-base/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push("/account")}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center text-text-primary transition hover:text-gold-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="flex-1 font-serif text-lg font-bold md:text-xl">
            <span className="gold-text">Help & Support</span>
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
        {/* Search */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for help..."
            className="w-full rounded-full border border-gold-primary/60 bg-bg-input py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
          />
        </div>

        {/* Popular Questions */}
        <div className="mt-5">
          <h2 className="mb-3 font-serif text-base font-bold text-gold-primary md:text-lg">
            Popular Questions
          </h2>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-gold-primary/40 bg-bg-card p-4 text-center text-xs text-text-muted md:text-sm">
              No results found for "{search}"
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-xl border border-gold-primary/40 bg-bg-card shadow-card-dark"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm font-medium text-text-primary md:text-base">
                        {faq.q}
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
                        className={`flex-shrink-0 text-gold-primary transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border-subtle px-4 py-3 text-xs leading-relaxed text-text-secondary md:text-sm">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="mt-8">
          <h2 className="mb-3 font-serif text-base font-bold text-gold-primary md:text-lg">
            Need More Help?
          </h2>

          <div className="space-y-2">
            <ContactRow
              icon="💬"
              title="Live Chat"
              subtitle="Chat with our support team"
              onClick={() => alert("Live chat coming soon!")}
            />
            <ContactRow
              icon="📱"
              title="WhatsApp"
              subtitle="+880 1712 345678"
              onClick={() => {
                window.open("https://wa.me/8801712345678", "_blank");
              }}
            />
            <ContactRow
              icon="✉️"
              title="Email Us"
              subtitle="support@chinadailybazar.com"
              onClick={() => {
                window.location.href = "mailto:support@chinadailybazar.com";
              }}
            />
          </div>
        </div>

        {/* Response time note */}
        <p className="mt-6 text-center text-[10px] text-text-muted md:text-xs">
          Our support team typically responds within 2 hours (9am–9pm BST)
        </p>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-gold-primary/40 bg-bg-card p-3 shadow-card-dark transition hover:-translate-y-0.5 hover:border-gold-primary md:p-4"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gold-primary/30 bg-bg-card-elevated text-lg md:text-xl">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-text-primary md:text-base">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">
          {subtitle}
        </p>
      </div>
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
    </button>
  );
}