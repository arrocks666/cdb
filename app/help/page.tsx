"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  loadSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/firestoreSettings";

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, []);

  const faqs = settings.faqItems ?? [];

  const filtered = faqs.filter((f) =>
    f.q.toLowerCase().includes(search.toLowerCase())
  );

  const hasContactInfo =
    settings.whatsappNumber || settings.contactEmail;

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
        {/* ABOUT */}
        <section id="about" className="scroll-mt-32 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
          <h2 className="text-base font-bold text-text-primary md:text-lg">About</h2>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary md:text-sm">
            {settings.footerDescription}
          </p>
        </section>

        {/* CONTACT */}
        <section id="contact" className="scroll-mt-32 mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
          <h2 className="text-base font-bold text-text-primary md:text-lg">Contact</h2>
          <div className="mt-3 space-y-2.5 text-xs md:text-sm">
            {settings.contactAddressBD && (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-gold-primary">📍</span>
                <p className="whitespace-pre-line text-text-secondary">
                  <span className="font-semibold text-text-primary">Bangladesh: </span>
                  {settings.contactAddressBD}
                </p>
              </div>
            )}
            {settings.contactAddressCN && (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-gold-primary">📍</span>
                <p className="whitespace-pre-line text-text-secondary">
                  <span className="font-semibold text-text-primary">China: </span>
                  {settings.contactAddressCN}
                </p>
              </div>
            )}
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-2 text-text-secondary transition hover:text-gold-primary">
                <span className="text-gold-primary">✉️</span>
                {settings.contactEmail}
              </a>
            )}
            {settings.contactPhone && (
              <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-text-secondary transition hover:text-gold-primary">
                <span className="text-gold-primary">📞</span>
                {settings.contactPhone}
              </a>
            )}
            {settings.ownerName && (
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="text-gold-primary">👤</span>
                <span>{settings.ownerName}</span>
              </div>
            )}
          </div>
        </section>

        {/* FAQ SEARCH */}
        <div className="relative mt-5">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
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
            className="w-full rounded-full border border-border-subtle bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-primary focus:outline-none"
          />
        </div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">
              Popular Questions
            </h2>
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-border-subtle bg-white p-4 text-center text-xs text-text-muted md:text-sm">
                No results found for "{search}"
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((faq, i) => {
                  const isOpen = openIndex === i;
                  return (
                    <div key={faq.id} className="overflow-hidden rounded-lg border border-border-subtle bg-white shadow-card-dark">
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
        )}

        {/* RETURNS */}
        {settings.returnPolicy && (
          <section id="returns" className="scroll-mt-32 mt-5 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
            <h2 className="text-base font-bold text-text-primary md:text-lg">
              Returns & Refund
            </h2>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-text-secondary md:text-sm">
              {settings.returnPolicy}
            </p>
          </section>
        )}

        {/* TERMS */}
        {settings.termsPolicy && (
          <section id="terms" className="scroll-mt-32 mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
            <h2 className="text-base font-bold text-text-primary md:text-lg">
              Terms & Conditions
            </h2>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-text-secondary md:text-sm">
              {settings.termsPolicy}
            </p>
          </section>
        )}

        {/* PRIVACY */}
        <section id="privacy" className="scroll-mt-32 mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
          <h2 className="text-base font-bold text-text-primary md:text-lg">
            Privacy Policy
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary md:text-sm">
            ChinaDailyBazar respects your privacy. We only collect information needed to process your orders and deliver your products — such as your name, phone number, email, and delivery address. We never sell or share your data with third parties. All payment information is handled securely.
          </p>
        </section>

        {/* SHIPPING CHARGE */}
        <section id="shipping" className="scroll-mt-32 mt-3 rounded-lg border border-border-subtle bg-white p-4 shadow-card-dark md:p-5">
          <h2 className="text-base font-bold text-text-primary md:text-lg">
            Shipping Charge
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary md:text-sm">
            Shipping charges are calculated after your order is placed and confirmed by our team. The final amount depends on the actual weight and dimensions of your product after it arrives at our Bangladesh warehouse.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary md:text-sm">
            You will be notified of the exact shipping charge before we ship the product to you.
          </p>
        </section>

        {/* CONTACT ROWS */}
        {hasContactInfo && (
          <div className="mt-8">
            <h2 className="mb-3 text-base font-bold text-text-primary md:text-lg">
              Need More Help?
            </h2>
            <div className="space-y-2">
              {settings.whatsappNumber && (
                <ContactRow
                  icon="📱"
                  title="WhatsApp"
                  subtitle={settings.whatsappNumber}
                  onClick={() => {
                    window.open(
                      `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`,
                      "_blank"
                    );
                  }}
                />
              )}
              {settings.contactEmail && (
                <ContactRow
                  icon="✉️"
                  title="Email Us"
                  subtitle={settings.contactEmail}
                  onClick={() => {
                    window.location.href = `mailto:${settings.contactEmail}`;
                  }}
                />
              )}
            </div>
          </div>
        )}
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
      className="group flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-white p-3 shadow-card-dark transition hover:shadow-card-hover md:p-4"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bg-orange text-lg md:text-xl">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-text-primary md:text-base">{title}</p>
        <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">{subtitle}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-gold-primary"><polyline points="9 18 15 12 9 6" /></svg>
    </button>
  );
}