// lib/scrape-batch.ts
// Runs the scrape for a range of subcategories (used by the admin "Refresh Products" button).
// Batched so it fits inside Netlify's 10-minute function timeout.

import { scrape1688, Raw1688Product } from "./apify-1688";
import { allSubcategories } from "./categories";
import { translateWithRetry, SiteProduct } from "./scrape-server";

const CNY_TO_BDT = 17.5;
const PRODUCTS_PER_SUBCATEGORY = 11;
const TRANSLATE_DELAY_MS = 800;

const CJK_REGEX = /[\u4e00-\u9fff]/;

function hasChinese(text: string | undefined | null): boolean {
  if (!text) return false;
  return CJK_REGEX.test(text);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
  return 1.10;
}

async function transformProduct(
  raw: Raw1688Product,
  categoryId: string,
  subcategoryId: string
): Promise<SiteProduct | null> {
  if (!raw.price || raw.price <= 0) return null;
  if (!raw.imageUrl || !raw.imageUrl.startsWith("http")) return null;

  const englishTitle = await translateWithRetry(raw.title);
  if (!englishTitle) return null;
  if (hasChinese(englishTitle)) return null;

  const priceBDT = raw.price * CNY_TO_BDT;
  const multiplier = markupMultiplier(priceBDT);
  const finalPrice = Math.round(priceBDT * multiplier);
  const oldPrice = Math.round(finalPrice * 1.25);
  const moq = raw.minOrderQuantity ?? 1;

  let provinceEn = "";
  if (raw.province && raw.province.trim()) {
    const t = await translateWithRetry(raw.province, 2);
    if (t && !hasChinese(t)) provinceEn = t;
  }

  const features: { icon: string; label: string }[] = [];
  if (provinceEn) features.push({ icon: "🏭", label: provinceEn });
  features.push({ icon: "📦", label: `MOQ ${moq}` });
  features.push({ icon: "⭐", label: `${raw.verifiedYears ?? 0} yrs` });

  const subtitle = provinceEn ? `${provinceEn} · China` : "China";

  return {
    id: raw.offerId,
    title: englishTitle.slice(0, 100),
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
    features,
    description: englishTitle,
    categoryId,
    subcategoryId,
    sourceUrl: raw.url,
    moq,
    supplierName: provinceEn || "China",
    priceOriginalCny: raw.price,
  };
}

export type BatchProgress = {
  subcategory: string;
  fetched: number;
  kept: number;
  error?: string;
};

/**
 * Run scrape on a specific range of subcategories.
 * Returns the products in this batch + progress log.
 */
export async function scrapeSubcategoryRange(
  startIndex: number,
  endIndex: number,
  onProgress?: (p: BatchProgress) => void
): Promise<{
  products: SiteProduct[];
  errors: string[];
  processedCount: number;
}> {
  const subcats = allSubcategories.slice(startIndex, endIndex);
  const products: SiteProduct[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const sub of subcats) {
    let fetched = 0;
    let kept = 0;

    try {
      const raw = await scrape1688(sub.keyword, PRODUCTS_PER_SUBCATEGORY);
      fetched = raw.length;

      for (const r of raw) {
        if (seenIds.has(r.offerId)) continue;

        const transformed = await transformProduct(
          r,
          sub.categoryId,
          sub.id
        );
        if (!transformed) continue;

        seenIds.add(r.offerId);
        products.push(transformed);
        kept++;

        await sleep(TRANSLATE_DELAY_MS);
      }
    } catch (err: any) {
      const msg = `${sub.name}: ${err.message}`;
      errors.push(msg);
    }

    if (onProgress) {
      onProgress({
        subcategory: sub.name,
        fetched,
        kept,
      });
    }
  }

  return {
    products,
    errors,
    processedCount: subcats.length,
  };
}

/**
 * Total number of subcategories (for progress display).
 */
export function getTotalSubcategories(): number {
  return allSubcategories.length;
}

/**
 * Get all subcategory names (for progress display).
 */
export function getSubcategoryNames(): string[] {
  return allSubcategories.map((s) => s.name);
}