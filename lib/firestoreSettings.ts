// lib/firestoreSettings.ts
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type MarkupTier = {
  id: string;
  min: number;
  max: number;
  multiplier: number;
};

export type FaqItem = {
  id: string;
  q: string;
  a: string;
};

export type StoreSettings = {
  cnyToUsd: number;
  usdToBdt: number;

  returnPolicy: string;
  termsPolicy: string;              // ✅ NEW
  deliveryInfo: string;
  howToOrder: string;

  faqItems: FaqItem[];              // ✅ NEW — up to 10

  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  ownerName: string;                // ✅ NEW — shown in footer
  whatsappNumber: string;
  whatsappNumber2: string;

  // ✅ NEW — social links
  facebookUrl: string;
  instagramUrl: string;
  footerDescription: string;        // ✅ NEW

  byAirRate1: number;
  byAirRate2: number;
  byAirDays: string;
  bySeaRate: number;
  bySeaDays: string;

  showByAirOnProductPage: boolean;
  showBySeaOnProductPage: boolean;

  payNowPercent: number;
  defaultWeightKg: number;
  shippingWarning: string;

  // ✅ NEW — global flat shipping charge (0 = free)
  shippingCharge: number;

  bkashNumber: string;
  nagadNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;

  logoUrl: string;
  markupTiers: MarkupTier[];

  shippingDetailsBangla: string;

  updatedAt?: unknown;
};

export const DEFAULT_MARKUP_TIERS: MarkupTier[] = [
  { id: "tier-1", min: 0, max: 500, multiplier: 1.5 },
  { id: "tier-2", min: 500, max: 2000, multiplier: 1.35 },
  { id: "tier-3", min: 2000, max: 5000, multiplier: 1.25 },
  { id: "tier-4", min: 5000, max: 10000, multiplier: 1.18 },
  { id: "tier-5", min: 10000, max: 99999999, multiplier: 1.12 },
];

// ✅ Default FAQs — admin can edit/remove/add up to 10
export const DEFAULT_FAQS: FaqItem[] = [
  { id: "faq-1", q: "How do I place an order?", a: "Browse products, tap 'Add to Cart' on items you like, then go to your cart and tap 'Proceed to Checkout'. Follow the 3 steps: address, payment, and confirm." },
  { id: "faq-2", q: "How long does shipping take?", a: "Delivery from China to Bangladesh typically takes 7–15 business days." },
  { id: "faq-3", q: "How can I track my order?", a: "Go to Account → My Orders, and tap on any order to see its live tracking timeline." },
  { id: "faq-4", q: "How do I cancel an order?", a: "You can cancel before the order is processed. Once shipped, cancellation is not possible." },
  { id: "faq-5", q: "How do refunds work?", a: "Request a return within 7 days. Refunds go to your bKash/Nagad within 3–5 business days." },
  { id: "faq-6", q: "Do you deliver all over Bangladesh?", a: "Yes, we deliver to every district in Bangladesh through our courier partners." },
  { id: "faq-7", q: "What payment methods do you accept?", a: "We accept bKash, Nagad, Bank Transfer, and Cash on Delivery." },
  { id: "faq-8", q: "Are the products authentic?", a: "Yes. All products are sourced directly from verified Chinese manufacturers on 1688.com." },
  { id: "faq-9", q: "Can I order wholesale in bulk?", a: "Absolutely. Contact us on WhatsApp for bulk orders and special pricing." },
  { id: "faq-10", q: "What if my product arrives damaged?", a: "Contact us within 48 hours with photos. We will arrange a replacement or refund." },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  cnyToUsd: 0.14,
  usdToBdt: 121,

  returnPolicy:
    "Returns accepted within 7 days of delivery for damaged or incorrect items. Contact us with photos and your order ID.",
  termsPolicy:
    "By using ChinaDailyBazar, you agree to our terms of service. All prices are in BDT. Orders are subject to product availability and shipping timelines. We reserve the right to cancel any order with a full refund.",
  deliveryInfo:
    "Orders are delivered across Bangladesh within 7–15 business days.",
  howToOrder:
    "1. Browse products\n2. Add to cart\n3. Login or sign up\n4. Provide delivery address\n5. Choose payment method\n6. Confirm order",

  faqItems: DEFAULT_FAQS,

  contactPhone: "+880 1XXX-XXXXXX",
  contactEmail: "support@chinadailybazar.com",
  contactAddress: "Dhaka, Bangladesh",
  ownerName: "ChinaDailyBazar Support",
  whatsappNumber: "8801689768307",
  whatsappNumber2: "8619822310841",

  facebookUrl: "",
  instagramUrl: "",
  footerDescription:
    "ChinaDailyBazar is your trusted wholesale marketplace, bringing quality products from China directly to Bangladesh. We specialize in sourcing authentic goods from verified Chinese manufacturers at factory prices — delivered fast to your doorstep.",

  byAirRate1: 770,
  byAirRate2: 1170,
  byAirDays: "12 - 20",
  bySeaRate: 120,
  bySeaDays: "30 - 45",

  showByAirOnProductPage: true,
  showBySeaOnProductPage: true,

  payNowPercent: 70,
  defaultWeightKg: 0.5,
  shippingWarning:
    "উল্লেখিত পণ্যের ওজন সঠিক নয়, আনুমানিক মাত্র। বাংলাদেশে আসার পর পণ্যের প্রকৃত ওজন মেপে শিপিং চার্জ হিসাব করা হবে।",

  shippingCharge: 0, // ✅ default 0 (free); admin can change

  bkashNumber: "01711-111111",
  nagadNumber: "01811-111111",
  bankName: "Dutch Bangla Bank",
  bankAccountNumber: "1234567890123",
  bankAccountHolder: "ChinaDailyBazar",

  logoUrl: "",
  markupTiers: DEFAULT_MARKUP_TIERS,

  shippingDetailsBangla: "",
};

const SETTINGS_DOC = ["settings", "general"] as const;

export async function loadSettings(): Promise<StoreSettings> {
  try {
    const ref = doc(db, SETTINGS_DOC[0], SETTINGS_DOC[1]);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return DEFAULT_SETTINGS;
    }

    const data = snap.data() as Partial<StoreSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      markupTiers: data.markupTiers ?? DEFAULT_MARKUP_TIERS,
      faqItems: data.faqItems ?? DEFAULT_FAQS,
    };
  } catch (err) {
    console.error("Error loading settings:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  partial: Partial<StoreSettings>
): Promise<void> {
  const ref = doc(db, SETTINGS_DOC[0], SETTINGS_DOC[1]);
  await setDoc(
    ref,
    {
      ...partial,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function findMarkupMultiplier(
  costBdt: number,
  tiers: MarkupTier[]
): number {
  for (const tier of tiers) {
    if (costBdt >= tier.min && costBdt < tier.max) {
      return tier.multiplier;
    }
  }
  return tiers[tiers.length - 1]?.multiplier ?? 1.1;
}