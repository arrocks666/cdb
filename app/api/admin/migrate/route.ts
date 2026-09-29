import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

export const runtime = "nodejs";
export const maxDuration = 300;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const BATCH_SIZE = 400;

/**
 * POST /api/admin/migrate
 * Body: { products: SiteProduct[] }
 * Imports to Firestore with lastSeenAt = now.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const products = body.products;

    if (!Array.isArray(products) || products.length === 0) {
      return Response.json(
        { error: "No products provided" },
        { status: 400 }
      );
    }

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const chunk = products.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const product of chunk) {
        try {
          const ref = doc(db, "products", product.id);
          batch.set(
            ref,
            {
              ...product,
              isLive: false,
              isFlashSale: product.isFlashSale ?? false,
              isTrending: product.isTrending ?? false,
              isFeatured: product.isFeatured ?? false,
              views: product.views ?? 0,
              lastSeenAt: Date.now(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          imported++;
        } catch {
          failed++;
        }
      }

      try {
        await batch.commit();
      } catch (err) {
        console.error("Batch commit failed:", err);
        failed += chunk.length;
        imported -= chunk.length;
      }
    }

    return Response.json({ imported, failed });
  } catch (err: any) {
    console.error("Migrate API error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}