// app/api/live-product/refresh/route.ts
// Re-enriches a stale live product by re-running Parsebird + Pizani.

import { NextRequest } from "next/server";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchPizani1688 } from "@/lib/pizani1688";
import { parsebirdByOfferId } from "@/lib/parsebird1688";
import { mergeToLiveForRefresh } from "@/lib/image-search";
import { saveLiveProduct } from "@/lib/firestoreLiveProducts";
import type { LiveProduct } from "@/lib/liveProduct";

export const runtime = "nodejs";
export const maxDuration = 300;

// ✅ In-memory lock to prevent duplicate refreshes for the same product
const inflight = new Map<string, Promise<LiveProduct | null>>();

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id") ?? "";
    if (!id.startsWith("live-")) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    // ✅ Join existing refresh if already in-flight
    if (inflight.has(id)) {
      console.log(`[refresh] ${id} already in-flight — joining`);
      const existing = await inflight.get(id)!;
      return Response.json({ product: existing });
    }

    const work = doRefresh(id);
    inflight.set(id, work);

    try {
      const product = await work;
      if (!product) {
        return Response.json(
          { error: "Failed to fetch product details" },
          { status: 500 }
        );
      }
      return Response.json({ product });
    } finally {
      inflight.delete(id);
    }
  } catch (err: any) {
    console.error("[refresh] error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

async function doRefresh(id: string): Promise<LiveProduct | null> {
  const snap = await getDoc(doc(db, "liveProducts", id));
  if (!snap.exists()) return null;

  const oldData = snap.data() as LiveProduct;
  const offerId = extractOfferId(id, oldData);
  if (!offerId) return null;

  console.log(`[refresh] ${id} offerId=${offerId} — re-enriching`);

  const [parsebird, pizani] = await Promise.all([
    parsebirdByOfferId(offerId).catch((err) => {
      console.warn(`[refresh] parsebird ${offerId} failed:`, err);
      return null;
    }),
    fetchPizani1688(offerId).catch((err) => {
      console.warn(`[refresh] pizani ${offerId} failed:`, err);
      return null;
    }),
  ]);

  if (!pizani) return null;

  const merged = mergeToLiveForRefresh(pizani, parsebird);
  merged.id = id;

  await saveLiveProduct(merged);

  console.log(`[refresh] ${id} ✓ re-enriched`);
  return merged;
}

function extractOfferId(id: string, product: LiveProduct): string | null {
  if (product.sourceUrl) {
    const m = product.sourceUrl.match(/offer\/(\d{8,15})/);
    if (m) return m[1];
  }
  const m = id.match(/live-(\d{8,15})/);
  if (m) return m[1];
  return null;
}