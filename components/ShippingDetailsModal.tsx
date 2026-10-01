"use client";

import { useEffect, useState } from "react";
import {
  loadSettings,
  DEFAULT_SETTINGS,
  type StoreSettings,
} from "@/lib/firestoreSettings";

const DEFAULT_BANGLA_TEXT = `ক্যাটাগরিঃ এ - ৮০০টাকা প্রতি কেজি

প্রতি কেজি জুতা, ব্যাগ, জুয়েলারী,যন্ত্রপাতি, স্টিকার, ইলেকট্রনিক্স, কম্পিউটার এক্সেসরীস, সিরামিক, ধাতব, চামড়া, রাবার,প্লাস্টিক জাতীয় পন্য, ব্যাটারি ব্যাতিত খেলনা।

ক্যাটাগরিঃ বি - ১২৫০টাকা প্রতি কেজি

ব্যাটারি জাতীয় যেকোণ পন্য, ডুপ্লিকেট ব্রান্ড বা কপিঁ পন্য, বীজ,রাসায়নীক দ্রব্য,নেটওয়ার্কিং আইটেম, ম্যাগনেট বা লেজার জাতীয় পন্য।

ক্যাটাগরিঃ সি

পোশাক / যেকোনো গার্মেন্টস আইটেম - ৮০০টাকা, খাদ্যপণ্য - ১৩০০টাকা,কিচেন নাইফ ১২০০,  তরল পণ্য / কসমেটিক্স - ১২৫০ টাকা, শুধু ব্যাটারি বা পাওয়ার ব্যাংক - ১৩৫০ টাকা, হিজাব / ওড়না - ৮০০টাকা, পাউডার - ১২০০ টাকা, সানগ্লাস - ৩৫০০ টাকা, সি সি ক্যামেরা - ১৫০০ টাকা, , স্মার্ট ওয়াচ ১২০০ টাকা, সাধারণ ঘড়ি - ১২৫০টাকা, ব্লুটুথ হেডফোন - ১২৫০টাকা।
পারফিউম—১৪০০ টাকা`;

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ShippingDetailsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!open) return;
    loadSettings().then(setSettings).catch(() => {});
  }, [open]);

  if (!open) return null;

  const text =
    settings.shippingDetailsBangla && settings.shippingDetailsBangla.trim()
      ? settings.shippingDetailsBangla
      : DEFAULT_BANGLA_TEXT;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 className="text-base font-bold text-text-primary md:text-lg">
            শিপিং চার্জ
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition hover:bg-bg-input hover:text-red-primary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary md:text-[15px]">
            {text}
          </p>
        </div>

        <div className="border-t border-border-subtle px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gold-primary py-2.5 text-sm font-semibold text-white shadow-orange-glow transition hover:bg-gold-luxury"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
}