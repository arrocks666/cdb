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

export type StoreSettings = {
  cnyToUsd: number;
  usdToBdt: number;

  returnPolicy: string;
  deliveryInfo: string;
  howToOrder: string;

  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  whatsappNumber: string;
  whatsappNumber2: string;

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

  bkashNumber: string;
  nagadNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;

  logoUrl: string;
  markupTiers: MarkupTier[];

  // Shipping details modal text (shown when "বিস্তারিত" is clicked)
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

export const DEFAULT_SETTINGS: StoreSettings = {
  cnyToUsd: 0.14,
  usdToBdt: 121,

  returnPolicy:
    "Returns accepted within 7 days of delivery for damaged or incorrect items. Contact us with photos and your order ID.",
  deliveryInfo:
    "Orders are delivered across Bangladesh within 7–15 business days. Delivery charge: ৳200 flat.",
  howToOrder:
    "1. Browse products\n2. Add to cart\n3. Login or sign up\n4. Provide delivery address\n5. Choose payment method\n6. Confirm order",

  contactPhone: "+880 1XXX-XXXXXX",
  contactEmail: "support@chinadailybazar.com",
  contactAddress: "Dhaka, Bangladesh",
  whatsappNumber: "8801689768307",
  whatsappNumber2: "8619822310841",

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

  bkashNumber: "01711-111111",
  nagadNumber: "01811-111111",
  bankName: "Dutch Bangla Bank",
  bankAccountNumber: "1234567890123",
  bankAccountHolder: "ChinaDailyBazar",

  logoUrl: "",
  markupTiers: DEFAULT_MARKUP_TIERS,

  shippingDetailsBangla: "",

  // updatedAt set on save
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