// lib/image-search.ts
// Image search pipeline.

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
import type { LiveProduct, LiveProductVariant } from "./liveProduct";
import {
  saveLiveProduct,
  saveSearchCache,
  getSearchCache,
  loadCachedProducts,
} from "./firestoreLiveProducts";

const APIFY_TOKEN = process.env.APIFY_TOKEN;

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");

const PRODUCTS_WANTED = 3;
const ASK_FOR = 3; // ✅ Keep this low for fast results
const MIN_PRICE_BDT = 20;

type RawListing = {
  offerId?: string;
  productId?: string;
  title?: string;
  titleEn?: string; 
  price?: number;
  priceUsd?: number; 
  priceYuan?: number;
  currency?: string;
  image?: string; 
  imageUrl?: string;
  productUrl?: string;
  detailUrl?: string;
  url?: string; 
  supplierName?: string;
  supplier?: { name?: string };
  [key: string]: unknown;
};

function toRawBase64(input: string): string {
  if (input.includes(",")) {
    const idx = input.indexOf(",");
    return input.slice(idx + 1);
  }
  return input;
}

// ✅ Stable hash — deterministic across runs of the same image
function hashImageBase64(base64: string): string {
  let h = 5381;
  for (let i = 0; i < base64.length; i += 7) {
    h = ((h << 5) + h + base64.charCodeAt(i)) >>> 0;
  }
  return `img_${h.toString(36)}_${base64.length}`;
}

async function findListingsByBase64(
  dataUrlOrBase64: string
): Promise<RawListing[]> {
  const rawBase64 = toRawBase64(dataUrlOrBase64);
  if (!rawBase64) throw new Error("Invalid image data");

  // 1. Upload to ImgBB first
  let imageUrl = "";
  try {
    const imgbbForm = new FormData();
    const buffer = Buffer.from(rawBase64, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });
    imgbbForm.append("image", blob, "search.jpg");

    const imgbbRes = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      { method: "POST", body: imgbbForm }
    );
    const imgbbData = await imgbbRes.json();
    if (imgbbData.success) {
      imageUrl = imgbbData.data.url;
      console.log(`[image-search] Uploaded to ImgBB: ${imageUrl}`);
    } else {
      throw new Error("ImgBB upload failed");
    }
  } catch (err: any) {
    console.warn(`[image-search] ImgBB failed, falling back to Base64`, err);
  }

  const input = {
    imageUrls: [imageUrl], 
    maxResultsPerInput: ASK_FOR, 
  };

  // ✅ Use the sync endpoint with the correct Actor ID (tilde ~)
  const ACTOR_ID = "blueskyscraper~1688-image-search-scraper"; 
  const runUrl = `https://api.apify.com/v2/actors/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&waitForFinish=30`;
  
  const startedAt = Date.now();
  console.log(`[image-search] POST sync actor=${ACTOR_ID} (max ${ASK_FOR} results)`);

  const response = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image search actor failed (${response.status}): ${text}`);
  }

  // The sync endpoint returns the dataset items directly
  const items = (await response.json()) as RawListing[];
  const ms = Date.now() - startedAt;

  console.log(`[image-search] ${items.length} listings in ${ms}ms`);
  return items;
}

function fallbackToLive(raw: RawListing): LiveProduct | null {
  const idMatch = (raw.url || "").match(/offer\/(\d+)/);
  const id = idMatch ? idMatch[1] : String(raw.offerId ?? raw.productId ?? "");
  
  const title = raw.titleEn || raw.title;
  const imageUrl = raw.image || raw.imageUrl;
  
  if (!id || !title || !imageUrl) return null;

  const priceUsd = typeof raw.priceUsd === "number" ? raw.priceUsd : 0;
  const priceCny = typeof raw.price === "number" ? raw.price : 0;
  
  let priceBdt = 0;
  if (priceUsd > 0) priceBdt = Math.round(priceUsd * 120);
  else if (priceCny > 0) priceBdt = Math.round(priceCny * 18.5);
  
  if (priceBdt < MIN_PRICE_BDT) return null;

  const oldPrice = Math.round(priceBdt * 1.25);

  return {
    id: `live-${id}`,
    title: String(title).slice(0, 120),
    subtitle: "China",
    price: priceBdt,
    priceMax: undefined,
    oldPrice,
    discount: 20,
    rating: 4.5,
    reviews: 0,
    image: String(imageUrl),
    gallery: [String(imageUrl)],
    colors: [],
    sizes: [],
    specs: undefined,
    videoUrl: undefined,
    inStock: true,
    stockCount: 999,
    features: [{ icon: "📍", label: "China" }],
    description: String(title),
    sourceUrl: String(raw.url || raw.detailUrl || ""),
    moq: 1,
    supplierName: String(raw.supplierName || "1688 Supplier"),
    priceOriginalCny: priceCny,
    isLive: true,
    lastRefreshedAt: Date.now(),
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

export function mergeToLive(
  pizani: PizaniProduct,
  parsebird: any | null // ✅ No longer used for variants
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

  return {
    id: `live-${pizani.id}`,
    title: pizani.title,
    subtitle: pizani.subtitle,
    price: pizani.price,
    priceMax: pizani.priceMax,
    priceCnyMin: pizani.priceCnyMin,
    priceCnyMax: pizani.priceCnyMax,
    oldPrice: pizani.oldPrice,
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
    priceOriginalCny: pizani.priceCnyMin,
    isLive: true,
    weightKg: pizani.weightKg,
    lastRefreshedAt: Date.now(),
  };
}

export function mergeToLiveForRefresh(
  pizani: PizaniProduct,
  parsebird: any | null
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
          return;
        }
      }
    } catch (cacheErr) {
      console.warn(`[job ${jobId}] cache lookup failed:`, cacheErr);
    }

    const listings = await findListingsByBase64(imageBase64OrUrl);

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
      const idMatch = (l.url || "").match(/offer\/(\d+)/);
      const id = idMatch ? idMatch[1] : String(l.offerId ?? l.productId ?? "");
      
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

    const savedProducts: LiveProduct[] = [];

    const tasks = offerIds.map(async (offerId) => {
      try {
        // ✅ SPEED FIX: Only fetch Pizani (details). Skip Parsebird entirely.
        const detail = await fetchPizani1688(offerId);

        if (detail) {
          // Pass null for Parsebird data
          const live = mergeToLive(detail, null);
          pushProduct(jobId, live);
          savedProducts.push(live);
          try {
            await saveLiveProduct(live);
          } catch (saveErr) {
            console.warn(`[job ${jobId}] save failed for ${live.id}:`, saveErr);
          }
          return;
        }
      } catch (err: any) {
        console.warn(`[job ${jobId}] ${offerId} failed: ${err.message}`);
      }

      const raw = listings.find((l) => {
        const idMatch = (l.url || "").match(/offer\/(\d+)/);
        const id = idMatch ? idMatch[1] : String(l.offerId ?? l.productId);
        return id === offerId;
      });

      if (raw) {
        const fallback = fallbackToLive(raw);
        if (fallback) {
          pushProduct(jobId, fallback);
          savedProducts.push(fallback);
          try {
            await saveLiveProduct(fallback);
          } catch (saveErr) {
            console.warn(`[job ${jobId}] save failed for ${fallback.id}:`, saveErr);
          }
        }
      }
    });

    await Promise.all(tasks);

    if (savedProducts.length > 0) {
      try {
        await saveSearchCache(imageHash, savedProducts.map((p) => p.id));
      } catch (cacheErr) {
        console.warn(`[job ${jobId}] cache save failed:`, cacheErr);
      }
    }

    updateJob(jobId, { status: "done" });
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