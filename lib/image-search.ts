// lib/image-search.ts
// Image search pipeline:
//   1. crawleast → 1688 offerIds
//   2. pizani/1688-product-scraper → full product with variants
//   3. Merge → LiveProduct

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { fetchPizani1688 } from "./pizani1688";
import type { PizaniProduct } from "./pizani1688";
import {
  createJob,
  updateJob,
  pushProduct,
  type ImageSearchJob,
} from "./imageSearchJobs";
import type { LiveProduct } from "./live-search";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_IMAGE_SEARCH_ACTOR_ID = process.env.APIFY_IMAGE_SEARCH_ACTOR_ID;

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");
if (!APIFY_IMAGE_SEARCH_ACTOR_ID)
  throw new Error("Missing APIFY_IMAGE_SEARCH_ACTOR_ID in .env.local");

const PRODUCTS_WANTED = 3;
const ASK_FOR = 5;

const IS_DEV00 = APIFY_IMAGE_SEARCH_ACTOR_ID.includes("dev00");
const IS_CRAWLEAST = APIFY_IMAGE_SEARCH_ACTOR_ID.includes("crawleast");

console.log(
  `[image-search] actor=${APIFY_IMAGE_SEARCH_ACTOR_ID} (dev00=${IS_DEV00}, crawleast=${IS_CRAWLEAST})`
);

type RawListing = {
  offerId?: string;
  productId?: string;
  title?: string;
  price?: number;
  priceYuan?: number;
  currency?: string;
  imageUrl?: string;
  productUrl?: string;
  detailUrl?: string;
  supplierName?: string;
  supplier?: { name?: string };
  [key: string]: unknown;
};

type RawImageSearchResult = {
  results?: RawListing[];
  matches?: RawListing[];
  listings?: RawListing[];
  error?: string | null;
  [key: string]: unknown;
};

// ---- catbox upload ----

export async function rehostImage(base64: string): Promise<string> {
  const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  const mimeExt = match ? match[1] : "jpg";
  const cleanBase64 = match
    ? match[2]
    : base64.replace(/^data:image\/\w+;base64,/, "");

  const ext = mimeExt === "jpeg" ? "jpg" : mimeExt;
  const filename = `cdb-${Date.now()}.${ext}`;
  const buffer = Buffer.from(cleanBase64, "base64");

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt));

    try {
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append(
        "fileToUpload",
        new Blob([new Uint8Array(buffer)], { type: `image/${mimeExt}` }),
        filename
      );

      const response = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        lastError = new Error(`catbox failed (${response.status})`);
        continue;
      }

      const url = (await response.text()).trim();
      if (!url.startsWith("https://")) {
        lastError = new Error(`catbox invalid URL: ${url}`);
        continue;
      }
      console.log(`[catbox] uploaded → ${url}`);
      return url;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw lastError ?? new Error("catbox upload failed");
}

// ---- Image search actor ----

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

async function findListingsByImage(imageUrl: string): Promise<RawListing[]> {
  let input: Record<string, unknown>;
  if (IS_DEV00) {
    input = {
      imageUrl,
      maxResults: ASK_FOR,
      destination: "1688",
      currency: "cny",
    };
  } else {
    input = {
      imageUrl,
      maxResults: ASK_FOR,
    };
  }

  const url = `https://api.apify.com/v2/acts/${APIFY_IMAGE_SEARCH_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=180`;
  const startedAt = Date.now();
  console.log(`[image-search] input: ${JSON.stringify(input)}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image search actor failed (${response.status}): ${text}`);
  }

  const items = (await response.json()) as RawImageSearchResult[];
  const ms = Date.now() - startedAt;

  const allListings: RawListing[] = [];
  for (const item of items) {
    if (item.error) continue;
    allListings.push(...extractListings(item));
  }

  console.log(`[image-search] ${allListings.length} listings in ${ms}ms`);
  return allListings;
}

// ---- Fallback ----

function fallbackToLive(raw: RawListing): LiveProduct | null {
  const id = String(raw.offerId ?? raw.productId ?? "");
  if (!id || !raw.title || !raw.imageUrl) return null;

  const priceCny =
    typeof raw.price === "number"
      ? raw.price
      : typeof raw.priceYuan === "number"
      ? raw.priceYuan
      : 0;
  if (priceCny <= 0) return null;

  const priceBdt = Math.round(priceCny * 18.5);
  const oldPrice = Math.round(priceBdt * 1.25);

  return {
    id: `live-${id}`,
    title: String(raw.title).slice(0, 120),
    subtitle: "China",
    price: priceBdt,
    priceMax: undefined,
    oldPrice,
    discount: 20,
    rating: 4.5,
    reviews: 0,
    image: String(raw.imageUrl),
    gallery: [String(raw.imageUrl)],
    colors: [],
    sizes: [],
    specs: undefined,
    videoUrl: undefined,
    inStock: true,
    stockCount: 999,
    features: [{ icon: "📍", label: "China" }],
    description: String(raw.title),
    sourceUrl: String(raw.detailUrl ?? raw.productUrl ?? ""),
    moq: 1,
    supplierName: String(
      raw.supplierName ?? raw.supplier?.name ?? "1688 Supplier"
    ),
    priceOriginalCny: priceCny,
    isLive: true,
  };
}

// ---- Convert PizaniProduct → LiveProduct ----

function pizaniToLive(p: PizaniProduct): LiveProduct {
  return {
    id: `live-${p.id}`,
    title: p.title,
    subtitle: p.subtitle,
    price: p.price,
    priceMax: p.priceMax,
    priceCnyMin: p.priceCnyMin,
    priceCnyMax: p.priceCnyMax,
    oldPrice: p.oldPrice,
    discount: p.discount,
    rating: p.rating,
    reviews: p.reviews,
    image: p.image,
    gallery: p.gallery,
    colors: p.colors,
    sizes: p.sizes,
    variants: p.variants,
    specs: p.specs,
    videoUrl: undefined,
    inStock: p.inStock,
    stockCount: p.stockCount,
    features: p.features,
    description: p.description,
    sourceUrl: p.sourceUrl,
    moq: p.moq,
    supplierName: p.supplierName,
    priceOriginalCny: p.priceOriginalCny,
    isLive: true,
    weightKg: p.weightKg,
  };
}

// ---- Main pipeline ----

export async function runImageSearchJob(
  jobId: string,
  imageBase64OrUrl: string
): Promise<void> {
  const t0 = Date.now();
  try {
    let hostedUrl = imageBase64OrUrl;
    if (imageBase64OrUrl.startsWith("data:")) {
      hostedUrl = await rehostImage(imageBase64OrUrl);
    }
    console.log(`[job ${jobId}] catbox done at +${Date.now() - t0}ms`);

    updateJob(jobId, { status: "searching", imageUrl: hostedUrl });

    const listings = await findListingsByImage(hostedUrl);
    console.log(`[job ${jobId}] image search done at +${Date.now() - t0}ms`);

    if (listings.length === 0) {
      updateJob(jobId, {
        status: "done",
        error: "No matching products found.",
      });
      return;
    }

    const offerIds: string[] = [];
    const seen = new Set<string>();
    for (const l of listings) {
      const id = String(l.offerId ?? l.productId ?? "");
      if (!/^\d{8,15}$/.test(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      offerIds.push(id);
      if (offerIds.length >= PRODUCTS_WANTED) break;
    }

    console.log(
      `[job ${jobId}] found ${offerIds.length} offerIds: ${offerIds.join(", ")}`
    );

    if (offerIds.length === 0) {
      updateJob(jobId, {
        status: "done",
        error: "No matching products found.",
      });
      return;
    }

    updateJob(jobId, {
      status: "loading",
      offerIds,
      totalExpected: offerIds.length,
    });

    console.log(`[job ${jobId}] fetching details via pizani (parallel)...`);

    // Parallel — pizani has no rate limits, safe to fire all 3 at once.
    const tasks = offerIds.map(async (offerId) => {
      const tStart = Date.now();
      try {
        const detail = await fetchPizani1688(offerId);
        if (detail) {
          const live = pizaniToLive(detail);
          pushProduct(jobId, live);
          console.log(
            `[job ${jobId}] ✓ pizani ${live.id} in ${Date.now() - tStart}ms`
          );
          return;
        }
        console.warn(`[job ${jobId}] ✗ pizani ${offerId} empty`);
      } catch (err: any) {
        console.warn(
          `[job ${jobId}] ✗ pizani ${offerId} failed: ${err.message}`
        );
      }

      // Fallback
      const raw = listings.find(
        (l) => String(l.offerId ?? l.productId) === offerId
      );
      if (raw) {
        const fallback = fallbackToLive(raw);
        if (fallback) {
          pushProduct(jobId, fallback);
          console.log(`[job ${jobId}] ✓ fallback ${fallback.id}`);
        }
      }
    });

    await Promise.all(tasks);

    updateJob(jobId, { status: "done" });
    console.log(`[job ${jobId}] DONE total=${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error(`[job ${jobId}] pipeline failed:`, err);
    updateJob(jobId, {
      status: "error",
      error: err?.message || "Search failed",
    });
  }
}

// ---- legacy compat ----

export async function imageSearch1688(
  imageUrl: string,
  _maxResults: number = PRODUCTS_WANTED
): Promise<LiveProduct[]> {
  const job = createJob();
  await runImageSearchJob(job.id, imageUrl);
  const { getJob } = await import("./imageSearchJobs");
  const final = getJob(job.id);
  return (final?.products as LiveProduct[]) ?? [];
}

export { createJob };
export type { ImageSearchJob };