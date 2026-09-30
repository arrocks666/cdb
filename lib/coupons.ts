// lib/coupons.ts
// Coupon system — Firestore helpers
// Coupons are stored inside the user doc: users/{uid}.coupons[]
// Admin gives them, user redeems at checkout.

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
  code: string;          // "CDB-4F2A91"
  amount: number;        // 100 = ৳100 off
  createdAt: number;     // epoch ms
  expiresAt: number;     // epoch ms
  used: boolean;
  usedAt?: number;
  orderId?: string;
};

/**
 * Generate a unique coupon code like CDB-4F2A91.
 */
export function generateCouponCode(): string {
  const chars = "ABCDEF0123456789";
  let code = "CDB-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Give a coupon to a specific user.
 * Returns the new coupon.
 */
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

/**
 * Read all coupons for a user.
 */
export async function getUserCoupons(uid: string): Promise<Coupon[]> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as { coupons?: Coupon[] };
    return data.coupons ?? [];
  } catch (err) {
    console.error("Error reading coupons:", err);
    return [];
  }
}

/**
 * Return only valid (unused + not expired) coupons.
 */
export function filterValidCoupons(coupons: Coupon[]): Coupon[] {
  const now = Date.now();
  return coupons.filter((c) => !c.used && c.expiresAt > now);
}

/**
 * Mark a coupon as used (vanish).
 */
export async function markCouponUsed(
  uid: string,
  coupon: Coupon,
  orderId: string
): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found");

  const data = snap.data() as { coupons?: Coupon[] };
  const coupons = data.coupons ?? [];

  const updated = coupons.map((c) =>
    c.code === coupon.code
      ? { ...c, used: true, usedAt: Date.now(), orderId }
      : c
  );

  await updateDoc(ref, { coupons: updated });
}

export type AdminUser = {
  uid: string;
  phone?: string;
  name?: string;
  email?: string;
  coupons?: Coupon[];
};

export async function getAllUsers(): Promise<AdminUser[]> {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<AdminUser, "uid">),
    }));
  } catch (err) {
    console.error("Error fetching users:", err);
    return [];
  }
}