// lib/coupons.ts
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
  percent: number;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  orderId?: string;
};

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
  percent: number,
  expiresInDays: number = 30
): Promise<Coupon> {
  const now = Date.now();
  const coupon: Coupon = {
    code: generateCouponCode(),
    percent,
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
    const data = snap.data() as { coupons?: Coupon[] };
    return data.coupons ?? [];
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