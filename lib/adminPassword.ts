// lib/adminPassword.ts
// Hash + verify admin password using bcryptjs.
// Password hash is stored in Firestore: settings/admin
// Username stays in .env.local (ADMIN_USERNAME).
// Password falls back to .env.local ADMIN_PASSWORD if Firestore is empty.

import bcrypt from "bcryptjs";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const ADMIN_DOC = ["settings", "admin"] as const;
const BCRYPT_ROUNDS = 10;

/**
 * Read the stored password hash from Firestore.
 * Returns null if not set.
 */
export async function getStoredPasswordHash(): Promise<string | null> {
  try {
    const ref = doc(db, ADMIN_DOC[0], ADMIN_DOC[1]);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as { passwordHash?: string };
    return data.passwordHash ?? null;
  } catch (err) {
    console.error("Error reading admin password hash:", err);
    return null;
  }
}

/**
 * Store a new password hash in Firestore.
 */
export async function setStoredPasswordHash(hash: string): Promise<void> {
  const ref = doc(db, ADMIN_DOC[0], ADMIN_DOC[1]);
  await setDoc(
    ref,
    {
      passwordHash: hash,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Hash a plaintext password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored hash.
 */
export async function verifyPasswordHash(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    console.error("Error verifying password:", err);
    return false;
  }
}

/**
 * Check if Firestore has an admin password hash set.
 */
export async function hasFirestorePassword(): Promise<boolean> {
  const hash = await getStoredPasswordHash();
  return hash !== null;
}

/**
 * Verify the admin password.
 * Order:
 *   1. Try Firestore hash (if set)
 *   2. Fall back to .env.local ADMIN_PASSWORD (plaintext)
 */
export async function verifyAdminPassword(
  password: string
): Promise<boolean> {
  const hash = await getStoredPasswordHash();

  if (hash) {
    return verifyPasswordHash(password, hash);
  }

  // Fallback: plaintext env password
  const envPassword = process.env.ADMIN_PASSWORD || "";
  if (!envPassword) {
    console.error("No admin password configured anywhere.");
    return false;
  }

  // Timing-safe-ish comparison
  if (password.length !== envPassword.length) return false;
  let diff = 0;
  for (let i = 0; i < password.length; i++) {
    diff |= password.charCodeAt(i) ^ envPassword.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Change the admin password.
 * Requires the old password to match first.
 */
export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  // Validate new password
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters" };
  }

  // Verify old password
  const valid = await verifyAdminPassword(oldPassword);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect" };
  }

  // Hash + save
  try {
    const hash = await hashPassword(newPassword);
    await setStoredPasswordHash(hash);
    return { ok: true };
  } catch (err: any) {
    console.error("Error changing password:", err);
    return { ok: false, error: err?.message ?? "Failed to save new password" };
  }
}