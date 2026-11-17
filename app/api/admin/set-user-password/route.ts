import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp, cert } from "firebase-admin/app";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (getApps().length === 0) {
      const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      
      if (!base64) {
        // ✅ Return the error to the screen
        return Response.json({ error: "Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in Netlify." }, { status: 500 });
      }

      try {
        const json = Buffer.from(base64, "base64").toString("utf-8");
        const serviceAccount = JSON.parse(json);
        
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        }

        initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (initErr: any) {
        // ✅ Return the exact init error to the screen
        return Response.json({ error: `Init Error: ${initErr.message}` }, { status: 500 });
      }
    }

    const body = await request.json();
    const { phone, email: realEmail, newPassword } = body as {
      phone?: string;
      email?: string;
      newPassword?: string;
    };

    if (!newPassword || newPassword.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const auth = getAuth();
    let user: any = null;

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
        if (err.code !== "auth/user-not-found") console.error(err);
      }
    }

    if (!user && realEmail) {
      try {
        user = await auth.getUserByEmail(realEmail);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") console.error(err);
      }
    }

    if (!user && phone) {
      try {
        user = await auth.getUserByPhoneNumber(phone);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found") console.error(err);
      }
    }

    if (!user) {
      return Response.json({ error: "User account not found in Auth." }, { status: 404 });
    }

    await auth.updateUser(user.uid, { password: newPassword });

    return Response.json({ success: true });
    
  } catch (err: any) {
    // ✅ Return the exact crash error to the screen
    return Response.json({ error: `Crash: ${err.message}` }, { status: 500 });
  }
}