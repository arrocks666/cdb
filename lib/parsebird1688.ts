// lib/parsebird1688.ts
// Wrapper around parsebird/1688-wholesale-scraper.
// Uses ASYNC run mode + retry on 0-results.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_PARSEBIRD_ACTOR_ID =
  process.env.APIFY_PARSEBIRD_ACTOR_ID ||
  "parsebird~1688-wholesale-scraper";

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");

const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 10 * 60 * 1000;
const RETRY_DELAY_MS = 2000;

export type ParsebirdListing = {
  offerId: string;
  title: string;
  detailUrl: string;
  priceMinCny: number;
  priceMaxCny: number;
  images: string[];
  mainImage: string;
  descriptionImages: string[];
  salesCount: number;
  unitWeightKg: number;
  minOrderQuantity: number;
  supplierName: string;
  location: string;
};

type RawParsebirdProduct = {
  offerId?: string | number;
  title?: string;
  detailUrl?: string;
  price?: { min?: number; max?: number; currency?: string };
  images?: string[];
  descriptionImages?: string[];
  saledCount?: number | null;
  orderCount?: number | null;
  recentSoldCount?: number | null;
  unitWeight?: number | null;
  minOrderQuantity?: number | null;
  supplier?: { companyName?: string };
  shipping?: { location?: string | null };
};

function isRealProductImage(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("cbu01.alicdn.com/img/ibank/")) return true;
  if (url.includes("cbu01.alicdn.com/cms/")) return true;
  return false;
}

function pickMainImage(product: RawParsebirdProduct): string {
  const all = [
    ...(product.descriptionImages ?? []),
    ...(product.images ?? []),
  ];
  const real = all.filter(isRealProductImage);
  return real[0] ?? "";
}

function parseSalesCount(product: RawParsebirdProduct): number {
  return (
    product.saledCount ??
    product.recentSoldCount ??
    product.orderCount ??
    0
  );
}

async function startRun(input: Record<string, unknown>): Promise<string> {
  const url = `https://api.apify.com/v2/acts/${APIFY_PARSEBIRD_ACTOR_ID}/runs?token=${APIFY_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start actor (${res.status}): ${text}`);
  }
  const data = await res.json();
  const runId = data?.data?.id;
  if (!runId) throw new Error("No run ID returned from actor start");
  return runId;
}

async function waitForRun(runId: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to check run (${res.status})`);
    const data = await res.json();
    const status = data?.data?.status;
    console.log(`[parsebird] run ${runId} status: ${status}`);
    if (status === "SUCCEEDED") return;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Actor run ended with status: ${status}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Actor run timed out waiting for completion");
}

async function fetchRunResults(runId: string): Promise<RawParsebirdProduct[]> {
  const url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&clean=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch results (${res.status})`);
  return (await res.json()) as RawParsebirdProduct[];
}

function transformListings(items: RawParsebirdProduct[]): ParsebirdListing[] {
  const listings: ParsebirdListing[] = [];
  for (const p of items) {
    const offerId = String(p.offerId ?? "");
    if (!offerId) continue;

    const mainImage = pickMainImage(p);
    if (!mainImage) continue;

    const priceMin = p.price?.min ?? 0;
    if (priceMin <= 0) continue;

    listings.push({
      offerId,
      title: (p.title ?? "").trim(),
      detailUrl:
        p.detailUrl ?? `https://detail.1688.com/offer/${offerId}.html`,
      priceMinCny: priceMin,
      priceMaxCny: p.price?.max ?? priceMin,
      images: p.images ?? [],
      mainImage,
      descriptionImages: p.descriptionImages ?? [],
      salesCount: parseSalesCount(p),
      unitWeightKg: p.unitWeight ?? 0,
      minOrderQuantity: p.minOrderQuantity ?? 1,
      supplierName: p.supplier?.companyName ?? "1688 Supplier",
      location: p.shipping?.location ?? "",
    });
  }

  listings.sort((a, b) => b.salesCount - a.salesCount);
  return listings;
}

export async function parsebirdSearch(
  keyword: string,
  maxResults: number,
  maxRetries: number = 3
): Promise<ParsebirdListing[]> {
  const overallStart = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const t0 = Date.now();

    // ✅ No proxyConfiguration — plain request works, RESIDENTIAL gets blocked
    const input = {
      keywords: [keyword],
      maxResults,
      includeDescriptionHtml: false,
      includeSkuDetails: false,
      includeSupplierIntelligence: false,
    };

    console.log(
      `[parsebird] attempt ${attempt}/${maxRetries} — "${keyword}" (max ${maxResults})`
    );

    try {
      const runId = await startRun(input);
      console.log(`[parsebird] run ${runId} started (attempt ${attempt})`);

      await waitForRun(runId);

      const items = await fetchRunResults(runId);
      const elapsed = Date.now() - t0;
      console.log(
        `[parsebird] attempt ${attempt}: ${items.length} raw results in ${elapsed}ms`
      );

      if (items.length > 0) {
        const listings = transformListings(items);
        console.log(
          `[parsebird] ✓ ${listings.length} usable after filter+sort (attempt ${attempt}, total ${Date.now() - overallStart}ms)`
        );
        return listings;
      }

      console.log(
        `[parsebird] attempt ${attempt} returned 0 — retrying...`
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    } catch (err: any) {
      console.error(
        `[parsebird] attempt ${attempt} failed:`,
        err?.message ?? err
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  console.log(
    `[parsebird] all ${maxRetries} attempts returned 0 results (total ${Date.now() - overallStart}ms)`
  );
  return [];
}