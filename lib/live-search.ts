// lib/live-search.ts
// Live 1688 search using parseforge/1688-scraper with caching.

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { translateToEnglish, hasChinese } from "./translation";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_1688_ACTOR_ID = process.env.APIFY_1688_ACTOR_ID;

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN");
if (!APIFY_1688_ACTOR_ID) throw new Error("Missing APIFY_1688_ACTOR_ID");

const CNY_TO_BDT = 17.5;

export type LiveProduct = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  colors: { id: string; label: string; hex: string }[];
  inStock: boolean;
  stockCount: number;
  features: { icon: string; label: string }[];
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  sourceUrl?: string;
  moq?: number;
  supplierName?: string;
  priceOriginalCny?: number;
  isLive?: boolean;
};

type ParseforgeProduct = {
  keyword?: string;
  offerId?: number | string;
  title?: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  minOrderQuantity?: number;
  saleQuantity?: number;
  repurchaseRate?: string;
  supplierName?: string;
  city?: string;
  province?: string;
};

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
  return 1.10;
}

function parseSalesText(text: string | null | undefined): number {
  if (!text) return 0;
  const wanMatch = text.match(/([\d.]+)\s*万/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
  const numMatch = text.match(/([\d.]+)/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return 0;
}

function parsePercent(text: string | undefined): number {
  if (!text) return 0;
  return parseInt(text.replace("%", ""), 10) || 0;
}

async function transformLiveProduct(
  raw: ParseforgeProduct
): Promise<LiveProduct | null> {
  if (!raw.price || raw.price <= 0) return null;
  if (!raw.imageUrl || !raw.imageUrl.startsWith("http")) return null;
  if (!raw.title) return null;

  const englishTitle = await translateToEnglish(raw.title);
  if (!englishTitle) return null;
  if (hasChinese(englishTitle)) return null;

  const priceBDT = raw.price * CNY_TO_BDT;
  const multiplier = markupMultiplier(priceBDT);
  const finalPrice = Math.round(priceBDT * multiplier);
  const oldPrice = Math.round(finalPrice * 1.25);
  const moq = raw.minOrderQuantity ?? 1;
  const saleQty = raw.saleQuantity ?? 0;
  const repurchase = parsePercent(raw.repurchaseRate);

  // Translate location
  let locationEn = "";
  if (raw.city && raw.city.trim()) {
    const t = await translateToEnglish(raw.city);
    if (t && !hasChinese(t)) locationEn = t;
  }
  if (!locationEn && raw.province && raw.province.trim()) {
    const t = await translateToEnglish(raw.province);
    if (t && !hasChinese(t)) locationEn = t;
  }

  const subtitle = locationEn ? `${locationEn}, China` : "China";

  return {
    id: `live-${raw.offerId}`,
    title: englishTitle.slice(0, 100),
    subtitle,
    price: finalPrice,
    oldPrice,
    discount: 20,
    rating: repurchase > 0
      ? Math.min(5, 4 + repurchase / 50)
      : 4.5,
    reviews: saleQty,
    image: raw.imageUrl,
    gallery: [raw.imageUrl],
    colors: [{ id: "default", label: "Default", hex: "#000000" }],
    inStock: true,
    stockCount: 999,
    features: [
      { icon: "📍", label: locationEn || "China" },
      { icon: "📦", label: `MOQ ${moq}` },
    ],
    description: englishTitle,
    sourceUrl: raw.url,
    moq,
    supplierName: locationEn || "China",
    priceOriginalCny: raw.price,
    isLive: true,
  };
}

function sortByBestSelling(items: ParseforgeProduct[]): ParseforgeProduct[] {
  return [...items].sort((a, b) => {
    const saleA = a.saleQuantity ?? 0;
    const saleB = b.saleQuantity ?? 0;
    if (saleB !== saleA) return saleB - saleA;

    const repA = parsePercent(a.repurchaseRate);
    const repB = parsePercent(b.repurchaseRate);
    return repB - repA;
  });
}

export async function liveSearch1688(
  keyword: string,
  maxResults: number = 3
): Promise<LiveProduct[]> {
  // Step 1: Cache check
  const { getCachedSearch, saveCachedSearch } = await import("./searchCache");
  const cached = await getCachedSearch(keyword);
  if (cached && cached.length > 0) {
    console.log(`[cache HIT] ${keyword}`);
    return cached.slice(0, maxResults);
  }
  console.log(`[cache MISS] ${keyword} — calling Apify`);

  // Step 2: Call Apify
  const url = `https://api.apify.com/v2/acts/${APIFY_1688_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`;

  const body = {
    searchTerms: [keyword],
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
    throw new Error(`Apify live search failed (${response.status}): ${text}`);
  }

  const items = (await response.json()) as ParseforgeProduct[];
  const valid = items.filter(
    (i) => i.price && i.price > 0 && i.imageUrl && i.title
  );

  const sorted = sortByBestSelling(valid);
  const transformed = await Promise.all(sorted.map(transformLiveProduct));
  const final = transformed.filter(Boolean) as LiveProduct[];

  // Step 3: Save to cache
  if (final.length > 0) {
    await saveCachedSearch(keyword, final);
  }

  return final;
}