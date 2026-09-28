import { NextRequest } from "next/server";
import { liveSearch1688 } from "@/lib/live-search";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("q")?.trim();

  if (!keyword) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  try {
    const products = await liveSearch1688(keyword, 3);
    return Response.json({
      products,
      count: products.length,
    });
  } catch (err: any) {
    console.error("Live search error:", err);
    return Response.json(
      { error: err.message || "Live search failed", products: [] },
      { status: 500 }
    );
  }
}