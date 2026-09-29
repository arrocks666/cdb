// lib/userProfile.ts
// Save/read user's payment methods + address in Firestore: users/{uid}

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type SavedPayments = {
  bkash?: string;
  nagad?: string;
  bank?: string;
};

export type SavedAddress = {
  name?: string;
  phone?: string;
  address?: string;
  district?: string;
};

export async function getSavedPayments(uid: string): Promise<SavedPayments> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    const data = snap.data() as { savedPayments?: SavedPayments };
    return data.savedPayments ?? {};
  } catch (err) {
    console.error("Error reading saved payments:", err);
    return {};
  }
}

export async function savePayments(
  uid: string,
  payments: SavedPayments
): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      savedPayments: payments,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getSavedAddress(uid: string): Promise<SavedAddress> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return {};
    const data = snap.data() as { savedAddress?: SavedAddress };
    return data.savedAddress ?? {};
  } catch (err) {
    console.error("Error reading saved address:", err);
    return {};
  }
}

export async function saveAddress(
  uid: string,
  address: SavedAddress
): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      savedAddress: address,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}