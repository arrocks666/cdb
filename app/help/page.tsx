"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const faqs = [
  { q: "How do I place an order?", a: "Browse products, tap 'Add to Cart' on items you like, then go to your cart and tap 'Proceed to Checkout'. Follow the 3 steps: address, payment, and confirm." },
  { q: "How long does shipping take?", a: "Delivery from China to Bangladesh typically takes 7–15 business days." },
  { q: "How can I track my order?", a: "Go to Account → My Orders, and tap on any order to see its live tracking timeline." },
  { q: "How do I cancel an order?", a: "You can cancel before the order is processed. Once shipped, cancellation is not possible." },
  { q: "How do refunds work?", a: "Request a return within 7 days. Refunds go to your bKash/Nagad within 3–5 business days." },
];

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = faqs.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="sticky top-[56px] z-40 border-b border-border-subtle bg-white shadow-sm md:top-[60px]">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/account")} className="flex h-8 w-8 items-center justify-center text-text-primary hover:text-gold-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="flex-1 text-lg font-bold text-text-primary md:text-xl">Help & Support</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4 md:px-4 md:py-6">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for help..." className="w-full rounded-full border border-border-subtle bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none" />
        </div>

        <div className="mt-5">
          <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">Popular Questions</h2>
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-border-subtle bg-white p-4 text-center text-xs text-text-muted md:text-sm">No results found for "{search}"</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                  <div key={faq.q} className="overflow-hidden rounded-lg border border-border-subtle bg-white shadow-card-dark">
                    <button onClick={() => setOpenIndex(isOpen ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                      <span className="text-sm font-medium text-text-primary md:text-base">{faq.q}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    {isOpen && <div className="border-t border-border-subtle bg-bg-input px-4 py-3 text-xs leading-relaxed text-text-secondary md:text-sm">{faq.a}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">Need More Help?</h2>
          <div className="space-y-2">
            <ContactRow icon="💬" title="Live Chat" subtitle="Chat with our support team" onClick={() => alert("Live chat coming soon!")} />
            <ContactRow icon="📱" title="WhatsApp" subtitle="+880 1965 119476" onClick={() => { window.open("https://wa.me/8801965119476", "_blank"); }} />
            <ContactRow icon="✉️" title="Email Us" subtitle="support@chinadailybazar.com" onClick={() => { window.location.href = "mailto:support@chinadailybazar.com"; }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon, title, subtitle, onClick }: { icon: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-white p-3 shadow-card-dark transition hover:shadow-card-hover md:p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bg-orange text-lg md:text-xl">{icon}</div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-text-primary md:text-base">{title}</p>
        <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">{subtitle}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-gold-primary"><polyline points="9 18 15 12 9 6" /></svg>
    </button>
  );
}