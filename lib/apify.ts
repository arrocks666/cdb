// lib/apify.ts
// Wrapper for the Apify Alibaba scraper (pro100chok/alibaba-scraper)

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID;

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");
if (!APIFY_ACTOR_ID) throw new Error("Missing APIFY_ACTOR_ID in .env.local");

export type RawAlibabaProduct = {
  type: string;
  source: string;
  productId: string;
  title: string;
  url: string;
  price: {
    currency: string;
    display: string;
    min: number | null;
    max: number | null;
    unit: string | null;
    discounted: boolean;
  };
  order: {
    minOrderQuantity: number | null;
    minOrderText: string | null;
    unit: string | null;
    leadTimeDays: number | null;
  };
  media: {
    mainImage: string | null;
    images: string[];
    hasVideo: boolean;
    videoId?: string;
  };
  ratings?: {
    score: number | null;
    count: number | null;
    productScore?: number | null;
    shippingScore?: number | null;
    serviceScore?: number | null;
    reviewsUrl: string | null;
    highlights?: { text: string; count: number }[];
  };
  supplier?: {
    name: string | null;
    id?: number | null;
    aliId?: number | null;
    country: string | null;
    countryCode: string | null;
    yearsOnAlibaba: number | null;
    profileUrl?: string | null;
    logo?: string | null;
    mainProducts?: string | null;
    isGoldSupplier?: boolean;
    isVerified?: boolean;
    verifiedBy?: string | null;
    tradeAssurance?: boolean;
    starLevel?: number | null;
    transactionLevel?: number | null;
    responseRate?: string | null;
    orders12Months?: number | null;
    transactionValue?: string | null;
    exportMarkets?: string[];
  };
  category?: { id: number };
  search?: { keyword: string; page: number; position: number };
  scrapedAt?: string;
};

/**
 * Run the Apify scraper for a single keyword.
 * Returns an array of raw product objects.
 */
export async function scrapeAlibaba(
  keyword: string,
  maxResults: number = 25
): Promise<RawAlibabaProduct[]> {
  const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=300`;

  const body = {
    scrapeType: "search",
    searchQueries: [keyword],
    maxItems: maxResults, // ← correct field name from actor schema
    includeProductDetail: false,
    includeReviews: false,
    includeSupplierProducts: false,
    includeSupplierProfile: false,
    outputFormat: "nested",
    currency: "USD",
    startUrls: [],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify request failed (${response.status}): ${text}`);
  }

  const items = (await response.json()) as RawAlibabaProduct[];
  return items;
}