// app/api/admin/set-user-password/route.ts
import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

export const runtime = "nodejs";
export const maxDuration = 60;

// ✅ FIX: Initialize Firebase Admin ONCE when the server starts.
if (getApps().length === 0) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  
  if (privateKey) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // ✅ CRITICAL FIX: Netlify stores the key as a single line with literal "\n" strings. 
        // We must convert them to real line breaks here.
        privateKey: privateKey.split("\\n").join("\n"),
      }),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email: realEmail, newPassword } = body as {
      phone?: string;
      email?: string;
      newPassword?: string;
    };

    if (!newPassword || newPassword.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (getApps().length === 0) {
      return Response.json(
        { error: "Firebase Admin is not configured on the server." },
        { status: 500 }
      );
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

    // --- FINAL CHECK ---
    if (!user) {
      return Response.json(
        { 
          error: "User account not found in Auth. They may need to register on the site first.",
          details: `Tried phone: ${phone}, email: ${realEmail}`
        },
        { status: 404 }
      );
    }

    // --- SUCCESS ---
    await auth.updateUser(user.uid, { password: newPassword });

    return Response.json({
      success: true,
      uid: user.uid,
      message: `Password reset for ${user.email || user.phoneNumber || user.uid}`,
    });

  } catch (err: any) {
    console.error("[set-user-password] error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}