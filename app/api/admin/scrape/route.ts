import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { scrapeSubcategoryRange } from "@/lib/scrape-batch";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/admin/scrape
 * Body: { start: number, end: number }
 * Runs scrape for subcategories in range [start, end).
 * Returns: { products: SiteProduct[], errors: string[], processedCount }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const start = Number(body.start ?? 0);
    const end = Number(body.end ?? 0);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return Response.json(
        { error: "Invalid range — start and end required, end > start" },
        { status: 400 }
      );
    }

    const result = await scrapeSubcategoryRange(start, end);

    return Response.json({
      products: result.products,
      errors: result.errors,
      processedCount: result.processedCount,
    });
  } catch (err: any) {
    console.error("Scrape API error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}