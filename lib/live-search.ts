// lib/live-search.ts
// Live 1688 search wrapper using the same Apify actor
// This returns a product in the SAME shape as our stored products

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { translateToEnglish } from "./translation";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_1688_ACTOR_ID = process.env.APIFY_1688_ACTOR_ID;
const USD_TO_BDT = parseInt(process.env.USD_TO_BDT ?? "121", 10);

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");
if (!APIFY_1688_ACTOR_ID) throw new Error("Missing APIFY_1688_ACTOR_ID in .env.local");

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

type Raw1688Product = {
  imageUrl: string;
  title: string;
  url: string;
  offerId: string;
  price: number;
  unit: string;
  minOrderQuantity: number;
  saleQuantity: number;
  compositeScore: number;
  supplierName: string;
  supplierType: string;
  verifiedYears: number;
  province: string;
  city: string;
  error: string | null;
};

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
  return 1.10;
}

async function transformLiveProduct(raw: Raw1688Product): Promise<LiveProduct | null> {
  if (!raw.price || raw.price <= 0) return null;
  if (!raw.imageUrl || !raw.imageUrl.startsWith("http")) return null;

  const englishTitle = await translateToEnglish(raw.title);
  const priceBDT = raw.price * CNY_TO_BDT;
  const multiplier = markupMultiplier(priceBDT);
  const finalPrice = Math.round(priceBDT * multiplier);
  const oldPrice = Math.round(finalPrice * 1.25);
  const moq = raw.minOrderQuantity ?? 1;

  let subtitle = "China";
  if (raw.province && raw.province.trim()) {
    const provinceEn = await translateToEnglish(raw.province);
    subtitle = `${provinceEn} · China`;
  }

  return {
    id: `live-${raw.offerId}`,
    title: englishTitle.slice(0, 80),
    subtitle,
    price: finalPrice,
    oldPrice,
    discount: 20,
    rating: raw.compositeScore ?? 4.5,
    reviews: raw.saleQuantity ?? 0,
    image: raw.imageUrl,
    gallery: [raw.imageUrl],
    colors: [{ id: "default", label: "Default", hex: "#000000" }],
    inStock: true,
    stockCount: 999,
    features: [
      { icon: "🏭", label: raw.province || "China" },
      { icon: "📦", label: `MOQ ${moq}` },
      { icon: "⭐", label: `${raw.verifiedYears} yrs` },
    ],
    description: englishTitle,
    sourceUrl: raw.url,
    moq,
    supplierName: raw.supplierName ?? "Unknown",
    priceOriginalCny: raw.price,
    isLive: true,
  };
}

export async function liveSearch1688(
  keyword: string,
  maxResults: number = 3
): Promise<LiveProduct[]> {
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

  const items = (await response.json()) as Raw1688Product[];
  const valid = items.filter((i) => !i.error);

  const transformed = await Promise.all(valid.map(transformLiveProduct));
  return transformed.filter(Boolean) as LiveProduct[];
}