// lib/coupons.ts
// Coupon system + user directory for admin panel.

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export type Coupon = {
  code: string;
  amount: number;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  orderId?: string;
};

type RawCoupon = {
  code?: string;
  amount?: number;
  percent?: number;
  createdAt?: number;
  expiresAt?: number;
  used?: boolean;
  usedAt?: number;
  orderId?: string;
};

// ✅ Also grab savedAddress so we can show real names in admin
type RawSavedAddress = {
  name?: string;
  phone?: string;
  address?: string;
  district?: string;
};

function normalizeCoupon(raw: RawCoupon): Coupon | null {
  if (!raw || !raw.code) return null;
  const amount =
    typeof raw.amount === "number"
      ? raw.amount
      : typeof raw.percent === "number"
      ? raw.percent
      : 0;

  return {
    code: raw.code,
    amount,
    createdAt: raw.createdAt ?? 0,
    expiresAt: raw.expiresAt ?? 0,
    used: !!raw.used,
    usedAt: raw.usedAt,
    orderId: raw.orderId,
  };
}

export function generateCouponCode(): string {
  const chars = "ABCDEF0123456789";
  let code = "CDB-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function giveCoupon(
  uid: string,
  amount: number,
  expiresInDays: number = 30
): Promise<Coupon> {
  const now = Date.now();
  const coupon: Coupon = {
    code: generateCouponCode(),
    amount,
    createdAt: now,
    expiresAt: now + expiresInDays * 24 * 60 * 60 * 1000,
    used: false,
  };

  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    coupons: arrayUnion(coupon),
  });

  return coupon;
}

export async function getUserCoupons(uid: string): Promise<Coupon[]> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as { coupons?: RawCoupon[] };
    const raw = data.coupons ?? [];
    return raw
      .map(normalizeCoupon)
      .filter((c): c is Coupon => c !== null && c.amount > 0);
  } catch (err) {
    console.error("Error reading coupons:", err);
    return [];
  }
}

export function filterValidCoupons(coupons: Coupon[]): Coupon[] {
  const now = Date.now();
  return coupons.filter((c) => !c.used && c.expiresAt > now);
}

export async function markCouponUsed(
  uid: string,
  coupon: Coupon,
  orderId: string
): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found");

  const data = snap.data() as { coupons?: RawCoupon[] };
  const coupons = data.coupons ?? [];

  const updated = coupons.map((c) => {
    if (c.code !== coupon.code) return c;
    const migrated: RawCoupon & { amount?: number } = { ...c };
    if (
      typeof migrated.amount !== "number" &&
      typeof migrated.percent === "number"
    ) {
      migrated.amount = migrated.percent;
    }
    delete migrated.percent;
    return {
      ...migrated,
      used: true,
      usedAt: Date.now(),
      orderId,
    };
  });

  await updateDoc(ref, { coupons: updated });
}

// ✅ Admin user directory
export type AdminUser = {
  uid: string;
  phone?: string;
  name?: string;          // resolved: top-level name OR savedAddress.name
  email?: string;
  coupons?: Coupon[];
  savedAddress?: RawSavedAddress;
};

export async function getAllUsers(): Promise<AdminUser[]> {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => {
      const data = d.data() as {
        coupons?: RawCoupon[];
        name?: string;
        phone?: string;
        email?: string;
        savedAddress?: RawSavedAddress;
      };

      const rawCoupons = data.coupons ?? [];
      const normalized = rawCoupons
        .map(normalizeCoupon)
        .filter((c): c is Coupon => c !== null);

      const savedAddress = data.savedAddress ?? {};
      // ✅ Prefer top-level name, fall back to savedAddress.name
      const resolvedName = data.name || savedAddress.name || undefined;

      return {
        uid: d.id,
        phone: data.phone ?? savedAddress.phone ?? undefined,
        name: resolvedName,
        email: data.email ?? undefined,
        coupons: normalized,
        savedAddress,
      };
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    return [];
  }
}