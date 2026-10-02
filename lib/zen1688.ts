// lib/zen1688.ts
// Wrapper around zen-studio/1688-wholesale-scraper.

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { translateToEnglish, hasChinese } from "./translation";
import { translateColorName } from "./colorTranslations";
import { computePrice, DEFAULT_PRICING } from "./pricing";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ZEN_ACTOR_ID =
  process.env.APIFY_1688_SCRAPER_ID || "zen-studio~1688-wholesale-scraper";

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN");


export type ZenSkuProp = {
  name: string;
  values: Array<{ name: string; imageUrl?: string | null }>;
};

export type ZenVariant = {
  specs: string;
  skuId: string;
  price: number;
  discountPrice: number;
  originalPrice: number;
  stock: number;
  imageUrl: string | null;
  weight?: number | null;
};

export type ZenProduct = {
  offerId: string;
  title: string;
  detailUrl: string;
  price: { min: number; max: number; currency: string };
  images: string[];
  videoUrl?: string;
  skuImages?: Array<{ name: string; imgUrl: string }>;
  province?: string;
  city?: string;
  saledCount?: number;
  saledCountStr?: string;
  reviewSummary?: {
    rating?: number;
    reviewCount?: number;
    positiveRate?: number;
  };
  stock?: number;
  minOrderQuantity?: number;
  unitWeight?: number | null;
  supplier?: {
    companyName?: string;
    city?: string;
    province?: string;
  };
  specs?: Array<{ name: string; value: string }>;
  skuDetails?: {
    priceRange?: string;
    totalVariants?: number;
    properties?: ZenSkuProp[];
    variants?: ZenVariant[];
  };
  descriptionImages?: string[];
  descriptionHtml?: string | null;
  categoryName?: string;
  scrapedAt?: string;
};

export type ZenSiteProduct = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  priceMax?: number;
  priceCnyMin?: number;
  priceCnyMax?: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  colors: { id: string; label: string; hex: string; image?: string }[];
  sizes: string[];
  variants?: {
    colorId?: string;
    size?: string;
    priceCny?: number;
    price?: number;
    stock?: number;
    image?: string;
    skuId?: string;
  }[];
  specs?: { name: string; value: string }[];
  videoUrl?: string;
  inStock: boolean;
  stockCount: number;
  features: { icon: string; label: string }[];
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  sourceUrl: string;
  moq: number;
  supplierName: string;
  priceOriginalCny: number;
  isLive?: boolean;
  weightKg?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function hexFromLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("black")) return "#000000";
  if (l.includes("white") || l.includes("off-white")) return "#FFFFFF";
  if (l.includes("navy")) return "#1E3A8A";
  if (l.includes("blue")) return "#2563EB";
  if (l.includes("red") || l.includes("wine") || l.includes("rose"))
    return "#DC2626";
  if (l.includes("green") || l.includes("army") || l.includes("mint"))
    return "#16A34A";
  if (l.includes("yellow") || l.includes("lemon")) return "#EAB308";
  if (l.includes("purple") || l.includes("violet") || l.includes("plum"))
    return "#7C3AED";
  if (l.includes("pink") || l.includes("peach")) return "#EC4899";
  if (l.includes("orange") || l.includes("apricot")) return "#EA580C";
  if (l.includes("gray") || l.includes("grey") || l.includes("cement"))
    return "#6B7280";
  if (l.includes("brown") || l.includes("coffee") || l.includes("mocha"))
    return "#78350F";
  if (l.includes("khaki")) return "#A16207";
  if (l.includes("beige") || l.includes("camel") || l.includes("champagne"))
    return "#F5F5DC";
  if (l.includes("gold")) return "#D4AF37";
  if (l.includes("silver")) return "#C0C0C0";
  if (l.includes("indigo") || l.includes("denim")) return "#3730A3";
  if (l.includes("klein") || l.includes("royal")) return "#1D4ED8";
  return "#9CA3AF";
}

function colorIdFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || "default";
}

function cleanSize(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/[（(][^）)]*[）)]/g, "").trim();
  s = s.replace(/^[-–—.]+/, "").trim();
  s = s.replace(/[^\x00-\x7F]/g, "").trim();
  return s.toUpperCase();
}

async function translateColorNames(
  names: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const raw of names) {
    const direct = translateColorName(raw);
    if (direct) {
      map.set(raw, direct);
      continue;
    }
    const t = await translateToEnglish(raw);
    const clean = t && !hasChinese(t) ? t : "";
    map.set(raw, clean);
  }
  return map;
}

async function translateSpecs(
  specs: Array<{ name: string; value: string }> | undefined
): Promise<{ name: string; value: string }[]> {
  if (!specs || specs.length === 0) return [];
  const out: { name: string; value: string }[] = [];

  const translations = await Promise.all(
    specs.map(async (s) => {
      if (s.name === "颜色" || s.name === "尺码") return null;
      const [nameEn, valueEn] = await Promise.all([
        translateToEnglish(s.name),
        translateToEnglish(s.value),
      ]);
      if (nameEn && valueEn && !hasChinese(nameEn) && !hasChinese(valueEn)) {
        return { name: nameEn, value: valueEn };
      }
      return null;
    })
  );

  for (const t of translations) {
    if (t) out.push(t);
  }
  return out;
}

async function callZen(
  input: Record<string, unknown>,
  timeoutSec: number = 300
): Promise<ZenProduct[]> {
  const url = `https://api.apify.com/v2/acts/${ZEN_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSec}`;

  console.log(`[zen] calling actor ${ZEN_ACTOR_ID}`);
  console.log(`[zen] input: ${JSON.stringify(input).slice(0, 300)}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zen actor failed (${response.status}): ${text}`);
  }

  const items = (await response.json()) as ZenProduct[];
  console.log(`[zen] actor returned ${items.length} items`);
  if (items.length > 0) {
    console.log(`[zen] first item offerId=${items[0].offerId} title=${String(items[0].title).slice(0, 40)}`);
  }
  return items;
}

async function transformZenProduct(
  raw: ZenProduct,
  categoryId?: string,
  subcategoryId?: string
): Promise<ZenSiteProduct | null> {
  if (!raw.price || !raw.price.min || raw.price.min <= 0) return null;
  if (!raw.images || raw.images.length === 0) return null;
  if (!raw.title) return null;

  const englishTitle = await translateToEnglish(raw.title);
  if (!englishTitle || hasChinese(englishTitle)) return null;

  const priceCnyMin = raw.price.min;
  const priceCnyMax = raw.price.max > raw.price.min ? raw.price.max : undefined;

  const priceMin = computePrice(priceCnyMin, DEFAULT_PRICING).sellingBdt;
  const priceMax = priceCnyMax
    ? computePrice(priceCnyMax, DEFAULT_PRICING).sellingBdt
    : undefined;

  const oldPrice = Math.round(priceMin * 1.3);
  const moq = raw.minOrderQuantity ?? 1;

  const [locationEn, supplierEn, colors, specs] = await Promise.all([
    (async () => {
      if (raw.city && raw.city.trim()) {
        const t = await translateToEnglish(raw.city);
        if (t && !hasChinese(t)) return t;
      }
      if (raw.province && raw.province.trim()) {
        const t = await translateToEnglish(raw.province);
        if (t && !hasChinese(t)) return t;
      }
      return "";
    })(),
    (async () => {
      if (raw.supplier?.companyName) {
        const t = await translateToEnglish(raw.supplier.companyName);
        if (t && !hasChinese(t)) return t;
      }
      return "";
    })(),
    (async () => {
      const props = raw.skuDetails?.properties ?? [];
      const colorProp = props.find((p) => p.name === "颜色");
      if (!colorProp || colorProp.values.length === 0) return [];

      const rawNames = colorProp.values.map((v) => v.name);
      const tmap = await translateColorNames(rawNames);

      return colorProp.values
        .map((v, idx) => {
          const label = tmap.get(v.name) ?? "";
          if (!label) return null;
          return {
            id: `${colorIdFromLabel(label)}-${idx}`,
            label,
            hex: hexFromLabel(label),
            image: v.imageUrl ?? undefined,
          };
        })
        .filter(Boolean) as {
        id: string;
        label: string;
        hex: string;
        image?: string;
      }[];
    })(),
    translateSpecs(raw.specs),
  ]);

  const props = raw.skuDetails?.properties ?? [];
  const sizeProp = props.find((p) => p.name === "尺码");
  let sizes: string[] = [];
  if (sizeProp && sizeProp.values.length > 0) {
    const cleaned = sizeProp.values.map((v) => cleanSize(v.name));
    const seen = new Set<string>();
    sizes = cleaned.filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  }

  const zenVariants = raw.skuDetails?.variants ?? [];
  const variants = zenVariants.map((v) => {
    const parts = v.specs.split(">").map((p) => p.trim());
    const rawColor = parts[0] ?? "";
    const rawSize = parts[1] ?? "";

    const matchedColor =
      colors.find(
        (c) =>
          c.label === rawColor ||
          c.label.includes(rawColor) ||
          rawColor.includes(c.label)
      ) ?? null;

    const cleanedSize = rawSize ? cleanSize(rawSize) : "";
    const priceCny = v.discountPrice || v.price || v.originalPrice || 0;
    const priceBdt = computePrice(priceCny, DEFAULT_PRICING).sellingBdt;

    return {
      colorId: matchedColor?.id,
      size: cleanedSize || undefined,
      priceCny,
      price: priceBdt,
      stock: v.stock,
      image: v.imageUrl ?? undefined,
      skuId: v.skuId,
    };
  });

  const subtitle = locationEn ? `${locationEn}, China` : "China";
  const rating = raw.reviewSummary?.rating
    ? Math.min(5, raw.reviewSummary.rating)
    : 4.5;
  const reviews = raw.saledCount ?? raw.reviewSummary?.reviewCount ?? 0;

  const features: { icon: string; label: string }[] = [];
  if (locationEn) features.push({ icon: "📍", label: locationEn });
  features.push({ icon: "📦", label: `MOQ ${moq}` });

  return {
    id: raw.offerId,
    title: englishTitle.slice(0, 100),
    subtitle,
    price: priceMin,
    priceMax,
    priceCnyMin,
    priceCnyMax,
    oldPrice,
    discount: 20,
    rating,
    reviews,
    image: raw.images[0],
    gallery: raw.images.filter(
      (u) => typeof u === "string" && u.startsWith("http")
    ),
    colors,
    sizes,
    variants: variants.length > 0 ? variants : undefined,
    specs: specs.length > 0 ? specs : undefined,
    videoUrl: raw.videoUrl || undefined,
    inStock: true,
    stockCount: raw.stock ?? 999,
    features,
    description: englishTitle,
    categoryId,
    subcategoryId,
    sourceUrl: raw.detailUrl,
    moq,
    supplierName: supplierEn || locationEn || "China",
    priceOriginalCny: priceCnyMin,
    weightKg: raw.unitWeight ?? undefined,
  };
}

export async function scrapeZenByKeyword(
  keyword: string,
  maxResults: number = 10
): Promise<ZenSiteProduct[]> {
  const items = await callZen({
    keywords: [keyword],
    maxResults,
    includeSkuVariants: true,
    includeSkuDetails: true,
    includeDescriptionHtml: false,
    includeSupplierIntelligence: false,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
    proxyCountryMode: "rotate",
  });

  const valid = items.filter(
    (i) => i.price && i.price.min > 0 && i.images?.length > 0 && i.title
  );

  const out = await Promise.all(valid.map((p) => transformZenProduct(p)));
  return out.filter(Boolean) as ZenSiteProduct[];
}

export async function scrapeZenByOfferIds(
  offerIds: string[]
): Promise<ZenSiteProduct[]> {
  if (offerIds.length === 0) return [];

  const items = await callZen({
    offerIds,
    maxResults: offerIds.length,
    includeSkuVariants: true,
    includeSkuDetails: true,
    includeDescriptionHtml: false,
    includeSupplierIntelligence: false,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
    proxyCountryMode: "rotate",
  });

  const out = await Promise.all(items.map((p) => transformZenProduct(p)));
  return out.filter(Boolean) as ZenSiteProduct[];
}

export async function scrapeZenByOfferId(
  offerId: string
): Promise<ZenSiteProduct | null> {
  const results = await scrapeZenByOfferIds([offerId]);
  return results[0] ?? null;
}