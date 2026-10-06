// app/api/admin/set-user-password/route.ts
// Admin-only — sets a user's password via Firebase Admin SDK.

import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

export const runtime = "nodejs";
export const maxDuration = 60;

if (getApps().length === 0) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
      /\\n/g,
      "\n"
    ),
  };

  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, newPassword } = body as {
      phone?: string;
      newPassword?: string;
    };

    if (!phone || !newPassword) {
      return Response.json(
        { error: "Phone and newPassword required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const digits = phone.replace(/\D/g, "");
    let normalized = digits;
    if (digits.startsWith("880") && digits.length === 13) {
      normalized = "0" + digits.slice(3);
    } else if (digits.startsWith("88") && digits.length === 13) {
      normalized = "0" + digits.slice(3);
    }

    const email = `${normalized}@chinadailybazar.app`;

    const auth = getAuth();

    try {
      const user = await auth.getUserByEmail(email);
      await auth.updateUser(user.uid, { password: newPassword });

      return Response.json({
        success: true,
        uid: user.uid,
        phone: normalized,
      });
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return Response.json(
          { error: `No account found for phone ${normalized}` },
          { status: 404 }
        );
      }
      throw err;
    }
  } catch (err: any) {
    console.error("[set-user-password] error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}