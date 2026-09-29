// lib/firestoreSettings.ts
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_PRICING, type PricingConfig } from "./pricing";

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

  updatedAt?: unknown;
};

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

export function settingsToPricing(settings: StoreSettings): PricingConfig {
  return {
    ...DEFAULT_PRICING,
    cnyToUsd: settings.cnyToUsd,
    usdToBdt: settings.usdToBdt,
  };
}