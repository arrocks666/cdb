// lib/image-search.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { translateToEnglish } from "./translation";
import { LiveProduct } from "./live-search";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_IMAGE_SEARCH_ACTOR_ID = process.env.APIFY_IMAGE_SEARCH_ACTOR_ID;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");
if (!APIFY_IMAGE_SEARCH_ACTOR_ID)
  throw new Error("Missing APIFY_IMAGE_SEARCH_ACTOR_ID in .env.local");
if (!IMGBB_API_KEY) throw new Error("Missing IMGBB_API_KEY in .env.local");

const CNY_TO_BDT = 17.5;
const IMAGE_RESULTS_PER_SEARCH = 2;

type RawListing = {
  offerId?: string;
  similarityRank?: number;
  title?: string;
  priceYuan?: number;
  consignPriceYuan?: number;
  moq?: number;
  bookedCount?: number;
  imageUrl?: string;
  detailUrl?: string;
  supplier?: {
    name?: string;
    city?: string;
    province?: string;
    yearsOnPlatform?: number;
    compositeScore?: number;
    isFactory?: boolean;
    isSuperFactory?: boolean;
  };
};

type RawImageSearchResult = {
  type?: string;
  status?: string;
  matchCount?: number;
  results?: RawListing[];
  matches?: RawListing[];
  listings?: RawListing[];
  error?: string | null;
  [key: string]: unknown;
};

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
  return 1.10;
}

export async function rehostImage(base64: string): Promise<string> {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");

  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY!);
  formData.append("image", cleanBase64);

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`imgbb upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.success || !data.data?.url) {
    throw new Error(`imgbb returned no URL: ${JSON.stringify(data)}`);
  }

  return data.data.url as string;
}

function extractListings(raw: RawImageSearchResult): RawListing[] {
  if (Array.isArray(raw.results)) return raw.results as RawListing[];
  if (Array.isArray(raw.matches)) return raw.matches as RawListing[];
  if (Array.isArray(raw.listings)) return raw.listings as RawListing[];

  for (const key of Object.keys(raw)) {
    const value = raw[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if (Array.isArray(nested.results)) return nested.results as RawListing[];
      if (Array.isArray(nested.matches)) return nested.matches as RawListing[];
      if (Array.isArray(nested.listings)) return nested.listings as RawListing[];
      if (Array.isArray(nested.items)) return nested.items as RawListing[];
      if (Array.isArray(nested.products)) return nested.products as RawListing[];
      if (Array.isArray(nested.data)) return nested.data as RawListing[];
    }
  }
  return [];
}

async function transformImageResult(raw: RawListing): Promise<LiveProduct | null> {
  // Direct match to crawleast actor fields
  if (!raw.imageUrl || !raw.imageUrl.startsWith("http")) return null;
  if (!raw.priceYuan || raw.priceYuan <= 0) return null;
  if (!raw.title) return null;

  const englishTitle = await translateToEnglish(raw.title);
  const priceBDT = raw.priceYuan * CNY_TO_BDT;
  const multiplier = markupMultiplier(priceBDT);
  const finalPrice = Math.round(priceBDT * multiplier);
  const oldPrice = Math.round(finalPrice * 1.25);

  const offerId = raw.offerId || Math.random().toString(36).slice(2, 10);
  const moq = raw.moq ?? 1;
  const reviews = raw.bookedCount ?? 0;
  const supplierName = raw.supplier?.name ?? "Verified Supplier";
  const province = raw.supplier?.province ?? "";
  const city = raw.supplier?.city ?? "";
  const verifiedYears = raw.supplier?.yearsOnPlatform ?? 5;
  const rating = raw.supplier?.compositeScore ?? 4.5;
  const detailUrl = raw.detailUrl ?? "";

  let subtitle = "China";
  if (province.trim()) {
    const provinceEn = await translateToEnglish(province);
    subtitle = `${provinceEn} · China`;
  }

  return {
    id: `img-${offerId}`,
    title: englishTitle.slice(0, 80),
    subtitle,
    price: finalPrice,
    oldPrice,
    discount: 20,
    rating,
    reviews,
    image: raw.imageUrl,
    gallery: [raw.imageUrl],
    colors: [{ id: "default", label: "Default", hex: "#000000" }],
    inStock: true,
    stockCount: 999,
    features: [
      { icon: "🏭", label: city || province || "China" },
      { icon: "📦", label: `MOQ ${moq}` },
      { icon: "⭐", label: `${verifiedYears} yrs` },
    ],
    description: englishTitle,
    sourceUrl: detailUrl,
    moq,
    supplierName,
    priceOriginalCny: raw.priceYuan,
    isLive: true,
  };
}

async function runActorAsync(
  actorId: string,
  input: Record<string, unknown>,
  maxWaitMs: number = 120000
): Promise<RawImageSearchResult[]> {
  const startUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`;
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`Apify start failed (${startRes.status}): ${text}`);
  }

  const run = (await startRes.json()).data;
  const runId = run.id;
  console.log(`Started Apify run: ${runId}`);

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 1500));

    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    if (!statusRes.ok) continue;

    const statusData = (await statusRes.json()).data;
    const status = statusData.status;
    console.log(`Run ${runId} status: ${status}`);

    if (status === "SUCCEEDED") {
      const datasetId = statusData.defaultDatasetId;
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
      );
      if (!dataRes.ok) throw new Error("Failed to fetch dataset");
      return (await dataRes.json()) as RawImageSearchResult[];
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ended with status: ${status}`);
    }
  }

  throw new Error("Apify run timed out");
}

export async function imageSearch1688(
  imageUrl: string,
  maxResults: number = IMAGE_RESULTS_PER_SEARCH
): Promise<LiveProduct[]> {
  const input = {
    imageUrls: [imageUrl],
    maxImages: 1,
    maxResultsPerImage: IMAGE_RESULTS_PER_SEARCH,
    enrichDetails: false,
  };

  let items: RawImageSearchResult[];

  try {
    const url = `https://api.apify.com/v2/acts/${APIFY_IMAGE_SEARCH_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=150`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.ok) {
      items = (await response.json()) as RawImageSearchResult[];
    } else {
      console.log(`Sync endpoint failed with ${response.status}, falling back to async`);
      items = await runActorAsync(APIFY_IMAGE_SEARCH_ACTOR_ID!, input);
    }
  } catch (err: any) {
    console.log(`Sync attempt error: ${err.message}, using async`);
    items = await runActorAsync(APIFY_IMAGE_SEARCH_ACTOR_ID!, input);
  }

  const allListings: RawListing[] = [];
  for (const item of items) {
    if (item.error) continue;
    const listings = extractListings(item);
    allListings.push(...listings);
  }

  console.log(`Extracted ${allListings.length} raw listings from actor`);

  const transformed = await Promise.all(allListings.map(transformImageResult));
  const final = (transformed.filter(Boolean) as LiveProduct[]).slice(0, maxResults);

  console.log(`Returning ${final.length} transformed products`);

  return final;
}