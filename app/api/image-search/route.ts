import { NextRequest } from "next/server";
import { rehostImage, imageSearch1688 } from "@/lib/image-search";

export const runtime = "nodejs";
export const maxDuration = 120;

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

    let hostedUrl: string;
    try {
      console.log("Rehosting uploaded image...");
      hostedUrl = await rehostImage(dataUrl);
      console.log("Hosted at:", hostedUrl);
    } catch (err: any) {
      console.error("Rehost failed:", err);
      return Response.json(
        {
          error:
            "Failed to upload image. Please try again or use a different photo.",
          products: [],
        },
        { status: 500 }
      );
    }

    let products;
    try {
      console.log("Searching 1688 by image...");
      products = await Promise.race([
        imageSearch1688(hostedUrl, 5),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Search timed out. The product may not be in our database."
                )
              ),
            90_000
          )
        ),
      ]);
      console.log(`Found ${products.length} matches`);
    } catch (err: any) {
      console.error("Search failed:", err);
      return Response.json(
        {
          error:
            err.message ||
            "Could not find matching products. Try a clearer photo.",
          products: [],
        },
        { status: 500 }
      );
    }

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