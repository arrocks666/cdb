"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  loadSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/firestoreSettings";

export default function Footer() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
  }, [pathname]);

  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-border-subtle bg-white">
      <div className="mx-auto max-w-[1800px] px-4 py-8 md:px-6 md:py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* BRAND + DESCRIPTION */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="logo"
                  className="h-10 w-10 flex-shrink-0 rounded-md object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gold-primary text-lg font-bold text-white shadow-orange-glow">
                  买
                </div>
              )}
              <div className="font-serif text-lg font-bold leading-none md:text-xl">
                <span className="text-text-primary">ChinaDaily</span>
                <span className="text-gold-primary">Bazar</span>
              </div>
            </Link>

            {settings.footerDescription && (
              <p className="mt-3 text-[11px] leading-relaxed text-text-secondary md:text-xs">
                {settings.footerDescription}
              </p>
            )}
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="text-sm font-bold text-text-primary md:text-base">
              Contact
            </h3>
            <div className="mt-3 space-y-2.5 text-[11px] md:text-xs">
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
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2 text-text-secondary transition hover:text-gold-primary"
                >
                  <span className="text-gold-primary">✉️</span>
                  {settings.contactEmail}
                </a>
              )}
              {settings.contactPhone && (
                <a
                  href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-text-secondary transition hover:text-gold-primary"
                >
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
          </div>

          {/* INFORMATION */}
          <div>
            <h3 className="text-sm font-bold text-text-primary md:text-base">
              Information
            </h3>
            <ul className="mt-3 space-y-2 text-[11px] md:text-xs">
              <li>
                <Link href="/help#about" className="text-text-secondary transition hover:text-gold-primary">
                  About
                </Link>
              </li>
              <li>
                <Link href="/help#contact" className="text-text-secondary transition hover:text-gold-primary">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/help#privacy" className="text-text-secondary transition hover:text-gold-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/help#returns" className="text-text-secondary transition hover:text-gold-primary">
                  Returns & Refund
                </Link>
              </li>
              <li>
                <Link href="/help#terms" className="text-text-secondary transition hover:text-gold-primary">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/help#shipping" className="text-text-secondary transition hover:text-gold-primary">
                  Shipping Charge
                </Link>
              </li>
            </ul>
          </div>

          {/* SOCIAL LINKS */}
          <div>
            <h3 className="text-sm font-bold text-text-primary md:text-base">
              Social Links
            </h3>
            <p className="mt-3 text-[11px] text-text-secondary md:text-xs">
              Follow us for updates and new products.
            </p>

            <div className="mt-3 flex items-center gap-2">
              {settings.facebookUrl ? (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:opacity-90"
                  aria-label="Facebook"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-input text-text-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
              )}

              {settings.instagramUrl ? (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white transition hover:opacity-90"
                  aria-label="Instagram"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-input text-text-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-4 text-center">
          <p className="text-[11px] text-text-muted md:text-xs">
            © {year} ChinaDailyBazar — All rights reserved. Made for Bangladesh 🇧🇩
          </p>
        </div>
      </div>
    </footer>
  );
}