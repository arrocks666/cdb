import { NextRequest } from "next/server";
import {
  verifyCredentials,
  createSessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE,
} from "@/lib/adminAuth";
import { verifyAdminPassword } from "@/lib/adminPassword";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    // Step 1: verify username (from .env.local, timing-safe)
    // We reuse verifyCredentials just for the username check by passing
    // the correct password expectation. But since password might be in
    // Firestore now, we only use verifyCredentials for the username.
    const expectedUser = process.env.ADMIN_USERNAME || "";
    const usernameMatches =
      expectedUser.length > 0 && username.length === expectedUser.length
        ? (() => {
            let diff = 0;
            for (let i = 0; i < username.length; i++) {
              diff |= username.charCodeAt(i) ^ expectedUser.charCodeAt(i);
            }
            return diff === 0;
          })()
        : false;

    if (!usernameMatches) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Step 2: verify password (Firestore hash first, then .env.local)
    const passwordValid = await verifyAdminPassword(password);

    if (!passwordValid) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const response = Response.json({ success: true });

    response.headers.append(
      "Set-Cookie",
      `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${ADMIN_COOKIE_MAX_AGE}; HttpOnly; SameSite=Strict${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return response;
  } catch (err: any) {
    console.error("Admin login error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}