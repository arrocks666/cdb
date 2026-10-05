// lib/image-search.ts
// Image search pipeline.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { fetchPizani1688 } from "./pizani1688";
import type { PizaniProduct } from "./pizani1688";
import { parsebirdByOfferId } from "./parsebird1688";
import type { ParsebirdListing } from "./parsebird1688";
import {
  createJob,
  updateJob,
  pushProduct,
  type ImageSearchJob,
} from "./imageSearchJobs";
import type { LiveProduct, LiveProductVariant } from "./liveProduct";
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
const PRICING_VERSION = 3;

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

function toRawBase64(input: string): string {
  if (input.includes(",")) {
    const idx = input.indexOf(",");
    return input.slice(idx + 1);
  }
  return input;
}

function hashImageBase64(base64: string): string {
  let h = 5381;
  for (let i = 0; i < base64.length; i += 7) {
    h = ((h << 5) + h + base64.charCodeAt(i)) >>> 0;
  }
  return `img_${h.toString(36)}_${base64.length}`;
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

function cnyToSellingBdt(cny: number): number {
  if (cny <= 0) return 0;
  const priceUsd = cny * 0.14;
  const costBdt = priceUsd * 121;
  let multiplier = 1.5;
  if (costBdt >= 500 && costBdt < 2000) multiplier = 1.35;
  else if (costBdt >= 2000 && costBdt < 5000) multiplier = 1.25;
  else if (costBdt >= 5000 && costBdt < 10000) multiplier = 1.18;
  else if (costBdt >= 10000) multiplier = 1.12;
  const sellingRaw = costBdt * multiplier;
  return Math.max(MIN_PRICE_BDT, Math.round(sellingRaw / 10) * 10);
}

function medianOf(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function pickRealBasePrice(prices: number[]): number {
  const valid = prices.filter((n) => n > 0);
  if (valid.length === 0) return 0;
  if (valid.length <= 2) return Math.min(...valid);

  const median = medianOf(valid);
  const threshold = median * 0.5;
  const filtered = valid.filter((n) => n >= threshold);
  if (filtered.length === 0) return Math.min(...valid);
  return Math.min(...filtered);
}

function parseWeightFromSpecs(
  specs: { name: string; value: string }[] | undefined
): number | undefined {
  if (!specs || specs.length === 0) return undefined;

  const weightSpec = specs.find((s) =>
    s.name.toLowerCase().includes("weight")
  );
  if (!weightSpec) return undefined;

  const val = weightSpec.value;

  const gramMatch = val.match(/(\d+(?:\.\d+)?)\s*g/i);
  if (gramMatch) {
    const grams = parseFloat(gramMatch[1]);
    if (grams > 0 && grams < 100000) return grams / 1000;
  }

  const kgMatch = val.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]);
    if (kg > 0 && kg < 100) return kg;
  }

  return undefined;
}

export function mergeToLive(
  pizani: PizaniProduct,
  parsebird: ParsebirdListing | null
): LiveProduct {
  const variants: LiveProductVariant[] = (pizani.variants ?? []).map((v) => ({
    colorId: v.colorId,
    size: v.size,
    priceCny: Number(v.priceCny) || undefined,
    price: Number(v.price) || undefined,
    stock: v.stock,
    image: v.image,
    skuId: v.skuId,
    specId: v.specId,
  }));

  const skuPrices: LiveProduct["skuPrices"] = {};

  if (parsebird && parsebird.skuVariants.length > 0) {
    for (const pv of parsebird.skuVariants) {
      const priceNum = Number(pv.priceCny) || 0;
      const discountNum = Number(pv.discountPriceCny) || priceNum;

      skuPrices[pv.specId] = {
        priceCny: priceNum,
        discountPriceCny: discountNum,
        stock: pv.stock,
      };

      const match = variants.find((v) => v.specId === pv.specId);
      if (match) {
        match.priceCny = discountNum;
        match.price = cnyToSellingBdt(discountNum);
        if (pv.stock != null) match.stock = pv.stock;
      }
    }
  }

  // ✅ WEIGHT — no fallback. Undefined = product has no weight data.
  let weightKg: number | undefined = undefined;

  if (parsebird?.unitWeightKg && parsebird.unitWeightKg > 0) {
    weightKg = parsebird.unitWeightKg;
  }

  if (!weightKg) {
    weightKg = parseWeightFromSpecs(pizani.specs);
  }

  let finalBasePrice = pizani.price;
  let finalOldPrice = pizani.oldPrice;
  let finalPriceCny = pizani.priceCnyMin;
  let finalPriceMax: number | undefined = undefined;

  if (parsebird && parsebird.skuVariants.length > 0) {
    const cnyPrices = parsebird.skuVariants
      .map((v) => Number(v.discountPriceCny) || Number(v.priceCny))
      .filter((n) => n > 0);

    if (cnyPrices.length > 0) {
      const baseCny = pickRealBasePrice(cnyPrices);
      finalBasePrice = cnyToSellingBdt(baseCny);
      finalOldPrice = Math.round(finalBasePrice * 1.3);
      finalPriceCny = baseCny;

      const maxCny = Math.max(...cnyPrices);
      const maxBdt = cnyToSellingBdt(maxCny);
      if (maxBdt > finalBasePrice * 1.2) {
        finalPriceMax = maxBdt;
      }

      console.log(
        `[image-search] ${pizani.id}: variants=${cnyPrices.length}, min=${Math.min(
          ...cnyPrices
        )}, max=${maxCny}, base=¥${baseCny}→৳${finalBasePrice}, weight=${weightKg ?? "none"}kg`
      );
    }
  }

  return {
    id: `live-${pizani.id}`,
    title: pizani.title,
    subtitle: pizani.subtitle,
    price: finalBasePrice,
    priceMax: finalPriceMax,
    priceCnyMin: finalPriceCny,
    priceCnyMax: pizani.priceCnyMax,
    oldPrice: finalOldPrice,
    discount: pizani.discount,
    rating: pizani.rating,
    reviews: pizani.reviews,
    image: pizani.image,
    gallery: pizani.gallery,
    colors: pizani.colors,
    sizes: pizani.sizes,
    variants: variants.length > 0 ? variants : undefined,
    specs: pizani.specs,
    videoUrl: undefined,
    inStock: pizani.inStock,
    stockCount: pizani.stockCount,
    features: pizani.features,
    description: pizani.description,
    sourceUrl: pizani.sourceUrl,
    moq: pizani.moq,
    supplierName: pizani.supplierName,
    priceOriginalCny: finalPriceCny,
    isLive: true,
    weightKg,
    skuPrices:
      Object.keys(skuPrices).length > 0 ? skuPrices : undefined,
    pricingVersion: PRICING_VERSION,
  };
}

export function mergeToLiveForRefresh(
  pizani: PizaniProduct,
  parsebird: ParsebirdListing | null
): LiveProduct {
  return mergeToLive(pizani, parsebird);
}

export async function runImageSearchJob(
  jobId: string,
  imageBase64OrUrl: string
): Promise<void> {
  const t0 = Date.now();
  try {
    updateJob(jobId, { status: "searching" });

    const rawBase64 = toRawBase64(imageBase64OrUrl);
    const imageHash = hashImageBase64(rawBase64);
    console.log(`[job ${jobId}] image hash = ${imageHash}`);

    try {
      const cachedIds = await getSearchCache(imageHash);
      if (cachedIds.length > 0) {
        const cachedProducts = await loadCachedProducts(cachedIds);
        if (cachedProducts.length > 0) {
          for (const p of cachedProducts) pushProduct(jobId, p);
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
      }
    } catch (cacheErr) {
      console.warn(`[job ${jobId}] cache lookup failed:`, cacheErr);
    }

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

    console.log(`[job ${jobId}] fetching Pizani + Parsebird (parallel)...`);

    const savedProducts: LiveProduct[] = [];

    const tasks = offerIds.map(async (offerId) => {
      const tStart = Date.now();
      try {
        const [detail, parsebirdData] = await Promise.all([
          fetchPizani1688(offerId),
          parsebirdByOfferId(offerId).catch((err) => {
            console.warn(`[job ${jobId}] parsebird ${offerId} failed:`, err);
            return null;
          }),
        ]);

        if (detail) {
          const live = mergeToLive(detail, parsebirdData);
          pushProduct(jobId, live);
          savedProducts.push(live);
          saveLiveProduct(live).catch((err) =>
            console.warn(`[job ${jobId}] save failed for ${live.id}:`, err)
          );
          console.log(
            `[job ${jobId}] ✓ ${live.id} (pizani + parsebird) in ${Date.now() - tStart}ms`
          );
          return;
        }
        console.warn(`[job ${jobId}] ✗ pizani ${offerId} empty`);
      } catch (err: any) {
        console.warn(`[job ${jobId}] ✗ ${offerId} failed: ${err.message}`);
      }

      const raw = listings.find(
        (l) => String(l.offerId ?? l.productId) === offerId
      );
      if (raw) {
        const fallback = fallbackToLive(raw);
        if (fallback) {
          pushProduct(jobId, fallback);
          savedProducts.push(fallback);
          saveLiveProduct(fallback).catch(() => {});
          console.log(`[job ${jobId}] ✓ fallback ${fallback.id}`);
        }
      }
    });

    await Promise.all(tasks);

    if (savedProducts.length > 0) {
      saveSearchCache(
        imageHash,
        savedProducts.map((p) => p.id)
      ).catch((err) => console.warn(`[job ${jobId}] cache save failed:`, err));
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