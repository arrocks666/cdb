// lib/image-search.ts
// Image search pipeline:
//   1. Hash image → check Firestore cache
//   2. Cache hit  → load products from liveProducts collection (fast!)
//   3. Cache miss → Clawst (base64) → offerIds → Pizani per offerId
//   4. Save each product to Firestore + remember hash → product ids
//
// No image hosting needed — Clawst takes base64 directly.

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
import type { LiveProduct } from "./liveProduct";
import {
  saveLiveProduct,
  saveSearchCache,
  getSearchCache,
  loadCachedProducts,
} from "./firestoreLiveProducts";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_IMAGE_SEARCH_ACTOR_ID = process.env.APIFY_IMAGE_SEARCH_ACTOR_ID;

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");
if (!APIFY_IMAGE_SEARCH_ACTOR_ID)
  throw new Error("Missing APIFY_IMAGE_SEARCH_ACTOR_ID in .env.local");

const PRODUCTS_WANTED = 3;
const ASK_FOR = 5;
const MIN_PRICE_BDT = 20;

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

// ---------- HELPERS ----------

function toRawBase64(input: string): string {
  if (input.includes(",")) {
    const idx = input.indexOf(",");
    return input.slice(idx + 1);
  }
  return input;
}

// Simple hash of base64 (avoids huge strings becoming Firestore doc ids)
function hashImageBase64(base64: string): string {
  let h = 5381;
  for (let i = 0; i < base64.length; i += 7) {
    h = ((h << 5) + h + base64.charCodeAt(i)) >>> 0;
  }
  return `img_${h.toString(36)}_${base64.length}`;
}

// ---------- CLAWST ACTOR (image → offerIds) ----------

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

async function findListingsByBase64(
  dataUrlOrBase64: string
): Promise<RawListing[]> {
  const rawBase64 = toRawBase64(dataUrlOrBase64);
  if (!rawBase64) throw new Error("Invalid image data");

  const input: Record<string, unknown> = {
    imagesBase64: [rawBase64],
    maxImages: 1,
    maxResultsPerImage: ASK_FOR,
  };

  const url = `https://api.apify.com/v2/acts/${APIFY_IMAGE_SEARCH_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=180`;
  const startedAt = Date.now();
  console.log(
    `[image-search] POST actor=${APIFY_IMAGE_SEARCH_ACTOR_ID} (base64 size: ${rawBase64.length} chars)`
  );

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

// ---------- FALLBACK (Clawst listing only) ----------

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
  if (priceBdt < MIN_PRICE_BDT) return null;

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

// ---------- PIZANI → LIVE ----------

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

// ---------- MAIN PIPELINE ----------

export async function runImageSearchJob(
  jobId: string,
  imageBase64OrUrl: string
): Promise<void> {
  const t0 = Date.now();
  try {
    updateJob(jobId, { status: "searching" });

    // ✅ STEP 1: Compute hash → check Firestore cache
    const rawBase64 = toRawBase64(imageBase64OrUrl);
    const imageHash = hashImageBase64(rawBase64);
    console.log(`[job ${jobId}] image hash = ${imageHash}`);

    try {
      const cachedIds = await getSearchCache(imageHash);
      if (cachedIds.length > 0) {
        console.log(`[job ${jobId}] CACHE HIT — ${cachedIds.length} products`);
        const cachedProducts = await loadCachedProducts(cachedIds);
        if (cachedProducts.length > 0) {
          for (const p of cachedProducts) {
            pushProduct(jobId, p);
          }
          updateJob(jobId, {
            status: "done",
            offerIds: cachedProducts.map((p) => p.id),
            totalExpected: cachedProducts.length,
          });
          console.log(
            `[job ${jobId}] DONE (cache) total=${Date.now() - t0}ms`
          );
          return;
        }
        // Cached ids exist but products deleted — fall through to live search
        console.log(`[job ${jobId}] cache stale — re-searching`);
      }
    } catch (cacheErr) {
      console.warn(`[job ${jobId}] cache lookup failed:`, cacheErr);
    }

    // ✅ STEP 2: Cache miss → Clawst
    const listings = await findListingsByBase64(imageBase64OrUrl);
    console.log(`[job ${jobId}] image search done at +${Date.now() - t0}ms`);

    if (listings.length === 0) {
      updateJob(jobId, {
        status: "done",
        error: "No matching products found. Try a clearer photo.",
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
        error: "No matching products found. Try a clearer photo.",
      });
      return;
    }

    updateJob(jobId, {
      status: "loading",
      offerIds,
      totalExpected: offerIds.length,
    });

    console.log(`[job ${jobId}] fetching details via pizani (parallel)...`);

    // ✅ STEP 3: Pizani per offerId (parallel)
    const savedProducts: LiveProduct[] = [];

    const tasks = offerIds.map(async (offerId) => {
      const tStart = Date.now();
      try {
        const detail = await fetchPizani1688(offerId);
        if (detail) {
          const live = pizaniToLive(detail);
          pushProduct(jobId, live);
          savedProducts.push(live);
          // ✅ Save to Firestore (fire and forget — don't block)
          saveLiveProduct(live).catch((err) =>
            console.warn(`[job ${jobId}] save failed for ${live.id}:`, err)
          );
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

      // Fallback: use Clawst listing only
      const raw = listings.find(
        (l) => String(l.offerId ?? l.productId) === offerId
      );
      if (raw) {
        const fallback = fallbackToLive(raw);
        if (fallback) {
          pushProduct(jobId, fallback);
          savedProducts.push(fallback);
          saveLiveProduct(fallback).catch((err) =>
            console.warn(`[job ${jobId}] save failed for ${fallback.id}:`, err)
          );
          console.log(`[job ${jobId}] ✓ fallback ${fallback.id}`);
        } else {
          console.log(`[job ${jobId}] ✗ fallback rejected (price too low)`);
        }
      }
    });

    await Promise.all(tasks);

    // ✅ STEP 4: Save image hash → product ids for next time
    if (savedProducts.length > 0) {
      saveSearchCache(
        imageHash,
        savedProducts.map((p) => p.id)
      ).catch((err) =>
        console.warn(`[job ${jobId}] cache save failed:`, err)
      );
    }

    updateJob(jobId, { status: "done" });
    console.log(`[job ${jobId}] DONE total=${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error(`[job ${jobId}] pipeline failed:`, err);
    updateJob(jobId, {
      status: "error",
      error: err?.message || "Search failed. Please try again.",
    });
  }
}

// ---------- LEGACY COMPAT ----------

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