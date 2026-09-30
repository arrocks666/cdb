import { NextRequest } from "next/server";
import { rehostImage } from "@/lib/image-search";
import { reverseImageSearch1688 } from "@/lib/reverseImageSearch";
import { translateToEnglish, hasChinese } from "@/lib/translation";
import { hashImage, getCachedImageResult, saveCachedImageResult } from "@/lib/imageHashCache";

export const runtime = "nodejs";
export const maxDuration = 120;

const CNY_TO_BDT = 18.32;
const USD_TO_BDT = 121;
const MAX_PRODUCTS = 3;

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
  return 1.10;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return Response.json({ error: "No image uploaded" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Image too large. Max 5MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const imageHash = hashImage(base64);
    console.log(`[Image search] hash: ${imageHash}`);

    // ⚠️ CACHE DISABLED FOR TESTING — re-enable after debug
    // const cached = await getCachedImageResult(imageHash);
    // if (cached && cached.productIds.length > 0) {
    //   console.log(`[cache HIT] image ${imageHash}`);
    //   const { getProduct } = await import("@/lib/firestoreProducts");
    //   const products = await Promise.all(
    //     cached.productIds.slice(0, MAX_PRODUCTS).map((id) => getProduct(id))
    //   );
    //   const valid = products.filter(Boolean);
    //   return Response.json({
    //     products: valid,
    //     count: valid.length,
    //     fromCache: true,
    //   });
    // }

    console.log(`[fresh run] image — uploading to ImgBB`);

    let hostedUrl: string;
    try {
      hostedUrl = await rehostImage(dataUrl);
    } catch (err) {
      console.error("ImgBB upload failed:", err);
      return Response.json(
        { error: "Failed to upload image. Try again." },
        { status: 500 }
      );
    }

    console.log(`[fresh run] image — running dev00 reverse search`);

    let matches;
    try {
      matches = await reverseImageSearch1688(hostedUrl, MAX_PRODUCTS);
    } catch (err: any) {
      console.error("Reverse search failed:", err);
      return Response.json(
        { error: "Could not find matching products. Try a clearer photo.", products: [] },
        { status: 500 }
      );
    }

    console.log(`[Transform] ${matches.length} matches from actor`);
    matches.forEach((m, i) => {
      console.log(`  [${i}] offerId=${m.offerId} title=${m.title.slice(0, 40)}`);
    });

    if (matches.length === 0) {
      return Response.json({
        products: [],
        message: "No matching products found.",
      });
    }

    const products = await Promise.all(
      matches.map(async (m) => {
        const englishTitle = await translateToEnglish(m.title);
        if (!englishTitle || hasChinese(englishTitle)) {
          console.log(`[skip] translation failed for: ${m.title.slice(0, 30)}`);
          return null;
        }

        const priceBDT =
          m.currency === "USD"
            ? m.price * USD_TO_BDT
            : m.price * CNY_TO_BDT;

        const multiplier = markupMultiplier(priceBDT);
        const finalPrice = Math.round(priceBDT * multiplier);
        const oldPrice = Math.round(finalPrice * 1.25);

        return {
          id: `live-${m.offerId}`,
          title: englishTitle.slice(0, 100),
          subtitle: "China",
          price: finalPrice,
          oldPrice,
          discount: 20,
          rating: 4.5,
          reviews: 0,
          image: m.imageUrl,
          gallery: [m.imageUrl],
          colors: [{ id: "default", label: "Default", hex: "#000000" }],
          inStock: true,
          stockCount: 999,
          features: [{ icon: "📍", label: "China" }],
          description: englishTitle,
          sourceUrl: m.url,
          moq: 1,
          supplierName: m.supplierName || "China",
          priceOriginalCny: m.price,
          isLive: true,
        };
      })
    );

    const valid = products.filter(Boolean);

    console.log(`[Transform] ${valid.length} valid products after translation`);
    valid.forEach((p, i) => {
      console.log(`  [${i}] id=${p?.id}`);
    });

    // Save to cache (re-enable later)
    if (valid.length > 0) {
      await saveCachedImageResult(
        imageHash,
        "image-search",
        valid.map((p) => p!.id)
      );
    }

    return Response.json({
      products: valid,
      count: valid.length,
    });
  } catch (err: any) {
    console.error("Image search error:", err);
    return Response.json(
      { error: err.message || "Image search failed", products: [] },
      { status: 500 }
    );
  }
}