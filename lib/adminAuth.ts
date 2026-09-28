// lib/adminAuth.ts
// Simple username/password admin auth using HTTP-only cookies.
// Credentials come from .env.local — never hardcoded.

import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "cdb_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "fallback-secret-change-me";
}

function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || "";
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify credentials against .env.local values.
 */
export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = getAdminUsername();
  const expectedPass = getAdminPassword();

  if (!expectedUser || !expectedPass) {
    console.error("Admin credentials not set in .env.local");
    return false;
  }

  const userMatch = safeEqual(username, expectedUser);
  const passMatch = safeEqual(password, expectedPass);
  return userMatch && passMatch;
}

/**
 * Create a signed session token.
 */
export function createSessionToken(): string {
  const payload = JSON.stringify({
    user: getAdminUsername(),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    // Random nonce ensures token changes each login
    nonce: crypto.randomBytes(16).toString("hex"),
  });

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  const combined = `${Buffer.from(payload).toString("base64url")}.${signature}`;
  return combined;
}

/**
 * Verify a session token. Returns true if valid and not expired.
 */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;

    const payload = Buffer.from(payloadB64, "base64url").toString();

    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    if (!safeEqual(signature, expectedSignature)) return false;

    const data = JSON.parse(payload);
    if (!data.exp || Date.now() > data.exp) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Server-side helper: check if the current request is from an authenticated admin.
 * Call this in server components or server actions.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Cookie helpers for route handlers / server actions.
 */
export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = SESSION_MAX_AGE;