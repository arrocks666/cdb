// lib/reverseImageSearch.ts
// Reverse image search on 1688/Alibaba via dev00 actor.

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_REVERSE_IMAGE_ACTOR_ID =
  process.env.APIFY_REVERSE_IMAGE_ACTOR_ID ||
  "dev00~alibaba-1688-aliexpress-reverse-image-search-api";

if (!APIFY_TOKEN) {
  throw new Error("Missing APIFY_TOKEN in .env.local");
}

export type ReverseMatch = {
  offerId: string;
  title: string;
  url: string;
  imageUrl: string;
  price: number;
  currency: string;
  supplierName: string;
  city: string;
  province: string;
  salesVolume: string;
  repurchaseRate: string;
};

export async function reverseImageSearch1688(
  imageUrl: string,
  maxResults: number = 3
): Promise<ReverseMatch[]> {
  const url = `https://api.apify.com/v2/acts/${APIFY_REVERSE_IMAGE_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90`;

  const body = {
    imageUrl: imageUrl,
    maxResults,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reverse image search failed (${response.status}): ${text}`);
  }

  const items = (await response.json()) as any[];

  // Get unique matches by productId
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const item of items) {
    const id = String(item.productId ?? item.offerId ?? item.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(item);
    if (unique.length >= maxResults) break;
  }

  return unique.map((item) => ({
    offerId: String(item.productId ?? item.offerId ?? item.id ?? ""),
    title: item.title ?? "",
    url: item.productUrl ?? item.url ?? "",
    imageUrl: item.imageUrl ?? item.image ?? "",
    price: item.price ?? 0,
    currency: item.currency ?? "USD",
    supplierName: item.supplierName ?? item.sellerName ?? "",
    city: "",
    province: "",
    salesVolume: "",
    repurchaseRate: item.reviewScore ?? "",
  }));
}