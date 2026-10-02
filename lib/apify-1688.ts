// lib/apify-1688.ts
// 1688 scraper using DataCach actor.

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_1688_ACTOR_ID = process.env.APIFY_1688_ACTOR_ID;

if (!APIFY_TOKEN) {
  throw new Error("Missing APIFY_TOKEN in .env.local");
}


export type Raw1688Product = {
  imageUrl: string;
  title: string;
  url: string;
  offerId: string;
  price: number;
  unit: string;
  minOrderQuantity: number;
  saleQuantity: number;
  gmv30Days: string;
  shopRepurchaseRate: string;
  compositeScore: number;
  supplierName: string;
  supplierType: string;
  verifiedYears: number;
  factoryInspection: string;
  province: string;
  city: string;
  sponsored: string;
  searchTerm: string;
  scrapedAt: string;
  error: string | null;
};

type DataCachProduct = {
  keyword?: string;
  offerId?: number | string;
  title?: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  priceTiers?: Array<{ quantity: string; price: number }>;
  bookedCount?: string;
  salesText?: string | null;
  repurchaseRate?: string;
  sellerName?: string;
  sellerMemberId?: string;
  sellerUrl?: string;
  sellerType?: string | null;
  city?: string;
  province?: string;
  isAd?: boolean;
  isFactory?: boolean;
  isVerified?: boolean;
  businessInspection?: boolean;
  factoryInspection?: boolean;
};

function parseSalesText(text: string | null | undefined): number {
  if (!text) return 0;
  const wanMatch = text.match(/([\d.]+)\s*万/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
  const numMatch = text.match(/([\d.]+)/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return 0;
}

function parseMOQ(product: DataCachProduct): number {
  const tiers = product.priceTiers ?? [];
  if (tiers.length === 0) return 1;
  const first = tiers[0].quantity;
  const match = first.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function transform(raw: DataCachProduct): Raw1688Product {
  const saleQuantity = parseSalesText(raw.salesText);
  const repurchase = raw.repurchaseRate
    ? parseInt(raw.repurchaseRate.replace("%", ""), 10) || 0
    : 0;

  return {
    imageUrl: raw.imageUrl ?? "",
    title: raw.title ?? "",
    url: raw.url ?? "",
    offerId: String(raw.offerId ?? ""),
    price: raw.price ?? 0,
    unit: "piece",
    minOrderQuantity: parseMOQ(raw),
    saleQuantity,
    gmv30Days: raw.salesText ?? "",
    shopRepurchaseRate: raw.repurchaseRate ?? "",
    compositeScore: repurchase,
    supplierName: raw.sellerName ?? "Unknown",
    supplierType: raw.sellerType ?? "",
    verifiedYears: raw.isVerified ? 5 : 0,
    factoryInspection: raw.factoryInspection
      ? "Yes"
      : raw.businessInspection
        ? "Yes"
        : "",
    province: raw.province ?? "",
    city: raw.city ?? "",
    sponsored: raw.isAd ? "Yes" : "",
    searchTerm: raw.keyword ?? "",
    scrapedAt: new Date().toISOString(),
    error: null,
  };
}

export async function scrape1688(
  keyword: string,
  maxResults: number = 11
): Promise<Raw1688Product[]> {
  const url = `https://api.apify.com/v2/acts/${APIFY_1688_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=300`;

  const body = {
    keywords: [keyword],
    maxItems: maxResults,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify 1688 request failed (${response.status}): ${text}`);
  }

  const items = (await response.json()) as DataCachProduct[];

  // Filter: valid image, title, and price >= 1 CNY
  return items
    .map(transform)
    .filter(
      (p) =>
        p.title &&
        p.imageUrl &&
        p.imageUrl.startsWith("http") &&
        p.price >= 1 &&
        p.offerId
    );
}