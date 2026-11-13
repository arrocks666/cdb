import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

if (getApps().length === 0) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (privateKey) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey.split("\\n").join("\n"), // Fixes Netlify newline issue
      }),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return Response.json({ error: "Email required" }, { status: 400 });

    const auth = getAuth();
    
    // Generate the secure link
    const resetLink = await auth.generatePasswordResetLink(email);

    // Send via Resend
    const { error } = await resend.emails.send({
      from: "ChinaDailyBazar <orders@updates.chinadailybazar.com>",
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #D4AF37;">Password Reset Request</h2>
          <p>Click the button below to set a new password for your account.</p>
          <a href="${resetLink}" style="background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reset Password</a>
          <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Reset error:", err);
    
    // ✅ FIX: Handle the case where the email is not registered in Firebase
    if (err.code === 'auth/internal-error' || err.message?.includes('EMAIL_NOT_FOUND')) {
      return Response.json(
        { error: "No account found with this email address." }, 
        { status: 404 }
      );
    }
    
    return Response.json({ error: err.message || "Failed to send" }, { status: 500 });
  }
}