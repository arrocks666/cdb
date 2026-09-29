// lib/scrape-server.ts
// Shared scrape logic. Used by CLI scripts and admin button.

import { scrape1688, Raw1688Product } from "./apify-1688";
import { allSubcategories } from "./categories";

const CNY_TO_BDT = 17.5;
const PRODUCTS_PER_SUBCATEGORY = 11;
const TRANSLATE_DELAY_MS = 800;
const TRANSLATE_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const CJK_REGEX = /[\u4e00-\u9fff]/;

function hasChinese(text: string | undefined | null): boolean {
  if (!text) return false;
  return CJK_REGEX.test(text);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function translateWithRetry(
  text: string,
  attempts = TRANSLATE_RETRIES
): Promise<string> {
  if (!text || !text.trim()) return "";

  const endpoints = [
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=`,
    `https://translate.google.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=`,
  ];

  for (let attempt = 0; attempt < attempts; attempt++) {
    for (const base of endpoints) {
      try {
        const url = `${base}${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (res.status === 429) continue;
        if (!res.ok) continue;

        const data = await res.json();
        const translated =
          data[0]?.map((item: any[]) => item[0]).join("") ?? "";
        if (translated && translated.trim()) return translated;
      } catch {
        continue;
      }
    }
    if (attempt < attempts - 1) await sleep(RETRY_DELAY_MS);
  }

  return "";
}

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
  return 1.10;
}

export type SiteProduct = {
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
  categoryId: string;
  subcategoryId: string;
  sourceUrl: string;
  moq: number;
  supplierName: string;
  priceOriginalCny: number;
};

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

export type ScrapeProgress = {
  current: number;
  total: number;
  subcategory: string;
  fetched: number;
  kept: number;
  skipped: number;
  error?: string;
};

export async function scrapeAllSubcategories(
  onProgress?: (p: ScrapeProgress) => void
): Promise<{
  products: SiteProduct[];
  totalFetched: number;
  totalKept: number;
  totalSkipped: number;
  errors: string[];
}> {
  const allProducts: SiteProduct[] = [];
  const seenIds = new Set<string>();
  const errors: string[] = [];
  let totalFetched = 0;
  let totalSkipped = 0;

  for (let i = 0; i < allSubcategories.length; i++) {
    const sub = allSubcategories[i];
    let fetched = 0;
    let kept = 0;
    let skipped = 0;

    try {
      const raw = await scrape1688(sub.keyword, PRODUCTS_PER_SUBCATEGORY);
      fetched = raw.length;
      totalFetched += raw.length;

      for (const r of raw) {
        if (seenIds.has(r.offerId)) continue;

        const transformed = await transformProduct(
          r,
          sub.categoryId,
          sub.id
        );

        if (!transformed) {
          skipped++;
          totalSkipped++;
          continue;
        }

        seenIds.add(r.offerId);
        allProducts.push(transformed);
        kept++;

        await sleep(TRANSLATE_DELAY_MS);
      }
    } catch (err: any) {
      errors.push(`${sub.name}: ${err.message}`);
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: allSubcategories.length,
        subcategory: sub.name,
        fetched,
        kept,
        skipped,
      });
    }
  }

  return {
    products: allProducts,
    totalFetched,
    totalKept: allProducts.length,
    totalSkipped,
    errors,
  };
}