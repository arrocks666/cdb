// app/api/admin/set-user-password/route.ts
import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // ✅ MOVE INITIALIZATION INSIDE THE TRY BLOCK
    if (getApps().length === 0) {
      const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      
      if (!base64) {
        console.error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in Netlify.");
        return Response.json(
          { error: "Server configuration error: Missing Admin Keys." }, 
          { status: 500 }
        );
      }

      try {
        const json = Buffer.from(base64, "base64").toString("utf-8");
        const serviceAccount = JSON.parse(json);
        
        // ✅ CRITICAL FIX: Force the private key to have real newlines
        // Netlify sometimes strips these, causing an Invalid PEM error
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        }

        initializeApp({
          credential: cert(serviceAccount),
        });
        console.log("Firebase Admin initialized successfully.");
      } catch (initErr: any) {
        console.error("Firebase Admin Init Error:", initErr);
        return Response.json(
          { error: `Failed to initialize Firebase Admin: ${initErr.message}` }, 
          { status: 500 }
        );
      }
    }

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
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") {
          console.error("[reset] Error looking up phone:", err);
        }
      }
    }

    // --- FINAL CHECK ---
    if (!user) {
      return Response.json(
        { error: "User account not found in Auth." },
        { status: 404 }
      );
    }

    // --- SUCCESS: Update the password ---
    await auth.updateUser(user.uid, { password: newPassword });

    return Response.json({
      success: true,
      message: `Password reset for ${user.email || user.phoneNumber || user.uid}`,
    });

  } catch (err: any) {
    console.error("[set-user-password] error:", err);
    // Always return JSON so the frontend doesn't crash
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}