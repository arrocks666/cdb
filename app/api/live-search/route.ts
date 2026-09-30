import { NextRequest } from "next/server";
import { searchFirestoreProducts } from "@/lib/firestoreSearch";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("q")?.trim();

  if (!keyword) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  try {
    const products = await searchFirestoreProducts(keyword, 30);

    return Response.json({
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        price: p.price,
        oldPrice: p.oldPrice,
        discount: p.discount,
        rating: p.rating,
        reviews: p.reviews,
        image: p.image,
        gallery: p.gallery,
        colors: p.colors,
        inStock: p.inStock,
        stockCount: p.stockCount,
        features: p.features,
        description: p.description,
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId,
        sourceUrl: p.sourceUrl,
        moq: p.moq,
        supplierName: p.supplierName,
        priceOriginalCny: p.priceOriginalCny,
        isLive: false,
      })),
      count: products.length,
    });
  } catch (err: any) {
    console.error("Search error:", err);
    return Response.json(
      { error: err.message || "Search failed", products: [] },
      { status: 500 }
    );
  }
}