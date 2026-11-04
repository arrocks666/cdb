// app/api/admin/set-user-password/route.ts
import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email: realEmail, newPassword } = body as {
      phone?: string;
      email?: string;
      newPassword?: string;
    };

    if (!newPassword || newPassword.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // ✅ FIX: Safely initialize Firebase Admin and catch missing env variables
    if (getApps().length === 0) {
      if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
        console.error("Missing Firebase Admin Environment Variables");
        return Response.json({ error: "Server configuration error: Missing Admin Keys." }, { status: 500 });
      }

      try {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        });
      } catch (initErr: any) {
        console.error("Firebase Admin Init Error:", initErr);
        return Response.json({ error: "Failed to initialize Firebase Admin." }, { status: 500 });
      }
    }

    const auth = getAuth();
    let user: any = null;

    // --- STEP 1: Try generated email from phone ---
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      let normalized = digits;
      if (digits.startsWith("880") && digits.length === 13) {
        normalized = "0" + digits.slice(3);
      } else if (digits.startsWith("88") && digits.length === 13) {
        normalized = "0" + digits.slice(3);
      }

      const generatedEmail = `${normalized}@chinadailybazar.app`;
      
      try {
        user = await auth.getUserByEmail(generatedEmail);
        console.log(`[reset] Found by generated email: ${generatedEmail}`);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") {
          console.error("[reset] Error looking up generated email:", err);
        }
      }
    }

    // --- STEP 2: Try real email (if provided) ---
    if (!user && realEmail) {
      try {
        user = await auth.getUserByEmail(realEmail);
        console.log(`[reset] Found by real email: ${realEmail}`);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") {
          console.error("[reset] Error looking up real email:", err);
        }
      }
    }

    // --- STEP 3: Try phone number (fallback) ---
    if (!user && phone) {
      try {
        user = await auth.getUserByPhoneNumber(phone);
        console.log(`[reset] Found by phone: ${phone}`);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") {
          console.error("[reset] Error looking up phone:", err);
        }
      }
    }

    if (!user) {
      return Response.json({ error: "User account not found in Auth." }, { status: 404 });
    }

    // --- SUCCESS ---
    await auth.updateUser(user.uid, { password: newPassword });

    return Response.json({
      success: true,
      message: `Password reset for ${user.email || user.phoneNumber || user.uid}`,
    });

  } catch (err: any) {
    console.error("[set-user-password] error:", err);
    // ✅ FIX: Always return JSON so the frontend doesn't crash
    return Response.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}