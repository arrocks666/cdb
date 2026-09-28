import { NextRequest } from "next/server";
import { rehostImage, imageSearch1688 } from "@/lib/image-search";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return Response.json({ error: "No image uploaded" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Image too large. Max 5MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log("Rehosting uploaded image...");
    const hostedUrl = await rehostImage(dataUrl);
    console.log("Hosted at:", hostedUrl);

    console.log("Searching 1688 by image...");
    const products = await imageSearch1688(hostedUrl, 5);
    console.log(`Found ${products.length} matches`);

    return Response.json({
      products,
      count: products.length,
    });
  } catch (err: any) {
    console.error("Image search error:", err);
    return Response.json(
      { error: err.message || "Image search failed", products: [] },
      { status: 500 }
    );
  }
}