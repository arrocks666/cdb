 
import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return Response.json({ error: "Email required" }, { status: 400 });

    const auth = getAuth();
    
    // 1. Generate the secure link
    const resetLink = await auth.generatePasswordResetLink(email);

    // 2. Extract the oobCode from the link
    const url = new URL(resetLink);
    const oobCode = url.searchParams.get("oobCode");

    if (!oobCode) {
      throw new Error("Failed to generate code");
    }

    // 3. Return the code to the frontend
    return Response.json({ success: true, oobCode });
    
  } catch (err: any) {
    console.error("Direct reset error:", err);
    // If the email doesn't exist in Firebase, it returns an error
    if (err.code === 'auth/internal-error' || err.message?.includes('EMAIL_NOT_FOUND')) {
      return Response.json({ error: "No account found with this email address." }, { status: 404 });
    }
    return Response.json({ error: err.message || "Failed to generate reset code" }, { status: 500 });
  }
}