// lib/detail1688.ts
// Wrapper around parse.bot's 1688 detail API.
// Uses only 2 endpoints per product + retries on 429 rate limit.

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

const PARSE_BOT_API_KEY = process.env.PARSE_BOT_API_KEY;
const PARSE_BOT_SCRAPER_ID = process.env.PARSE_BOT_SCRAPER_ID;

if (!PARSE_BOT_API_KEY)
  throw new Error("Missing PARSE_BOT_API_KEY in .env.local");
if (!PARSE_BOT_SCRAPER_ID)
  throw new Error("Missing PARSE_BOT_SCRAPER_ID in .env.local");

const BASE_URL = `https://api.parse.bot/scraper/${PARSE_BOT_SCRAPER_ID}`;

// =============================================
// Raw response types
// =============================================

type RawImage = {
  fullPathImageURI: string;
  imageURI: string;
};

type RawProp = {
  fid: number;
  prop: string;
  value: Array<{ name: string; imageUrl?: string }>;
};

type RawSku = {
  skuId: number;
  specAttrs: string;
  priceAmount: number;
  canBookCount: number;
};

type RawAttribute = {
  fid: number;
  name: string;
  value: string;
  values: string[];
};

type DetailResponse = {
  status: string;
  data: {
    title: string;
    offer_id: string;
    images: RawImage[];
    main_images: RawImage[];
    sale_num: number | null;
    unit: string;
    price_range: { min: string; max: string };
    seller: {
      company_name: string;
      login_id: string;
      member_id: string;
    };
    attributes: RawAttribute[];
    weight_measurements: {
      unit_weight_kg: number;
      sku_weights_kg: Record<string, number>;
      pieces: Array<{ weight_kg: number }>;
    } | null;
  };
};

type VariantsResponse = {
  status: string;
  data: {
    props: RawProp[];
    sku_map: RawSku[];
    sku_features: Record<string, unknown>;
  };
};

// =============================================
// Public type
// =============================================

export type Detail1688Product = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  priceMax?: number;
  priceCnyMin: number;
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
  inStock: boolean;
  stockCount: number;
  features: { icon: string; label: string }[];
  description: string;
  sourceUrl: string;
  moq: number;
  supplierName: string;
  priceOriginalCny: number;
  weightKg?: number;
  isLive: true;
};

// =============================================
// HTTP helper with 429 retry
// =============================================

async function callEndpoint<T>(
  endpoint: string,
  offerId: string
): Promise<T | null> {
  const url = `${BASE_URL}/${endpoint}?offer_id=${encodeURIComponent(offerId)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "X-API-Key": PARSE_BOT_API_KEY! },
      });

      if (res.status === 429) {
        const waitMs = 15000 * (attempt + 1);
        console.warn(
          `[detail1688] ${endpoint} 429, waiting ${waitMs}ms before retry ${attempt + 1}/3`
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        console.warn(`[detail1688] ${endpoint} → HTTP ${res.status}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[detail1688] ${endpoint} error:`, err);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      return null;
    }
  }

  console.warn(`[detail1688] ${endpoint} failed after 3 attempts`);
  return null;
}

// =============================================
// Helpers
// =============================================

function hexFromName(name: string, fallback?: string): string {
  if (fallback && fallback.startsWith("#")) return fallback;
  const l = name.toLowerCase();
  if (l.includes("black")) return "#000000";
  if (l.includes("white")) return "#FFFFFF";
  if (l.includes("red")) return "#DC2626";
  if (l.includes("blue")) return "#2563EB";
  if (l.includes("green")) return "#16A34A";
  if (l.includes("yellow")) return "#EAB308";
  if (l.includes("purple")) return "#7C3AED";
  if (l.includes("pink")) return "#EC4899";
  if (l.includes("orange")) return "#EA580C";
  if (l.includes("gray") || l.includes("grey")) return "#6B7280";
  if (l.includes("brown")) return "#78350F";
  if (l.includes("navy")) return "#1E3A8A";
  if (l.includes("beige") || l.includes("apricot")) return "#F5DEB3";
  if (l.includes("gold")) return "#D4AF37";
  if (l.includes("silver")) return "#C0C0C0";
  if (l.includes("mint")) return "#A7F3D0";
  if (l.includes("indigo")) return "#3730A3";
  return "#9CA3AF";
}

function colorIdFromLabel(label: string, idx: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug ? `${slug}-${idx}` : `color-${idx}`;
}

async function translateSafe(text: string): Promise<string> {
  if (!text) return "";
  if (!hasChinese(text)) return text.trim();
  const t = await translateToEnglish(text);
  return t && !hasChinese(t) ? t.trim() : "";
}

async function translateAll(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map((t) => translateSafe(t)));
}

// =============================================
// Main fetch
// =============================================

export async function fetchDetail1688(
  offerId: string
): Promise<Detail1688Product | null> {
  console.log(`[detail1688] fetching ${offerId}...`);
  const t0 = Date.now();

  // ⭐ Only 2 endpoints — attributes come from the details response
  const [detailRes, variantsRes] = await Promise.all([
    callEndpoint<DetailResponse>("get_product_details", offerId),
    callEndpoint<VariantsResponse>("get_product_variants", offerId),
  ]);

  console.log(`[detail1688] ${offerId} HTTP done in ${Date.now() - t0}ms`);

  if (!detailRes || detailRes.status !== "success" || !detailRes.data) {
    console.warn(`[detail1688] ${offerId} no detail data`);
    return null;
  }

  const d = detailRes.data;

  // Price
  const minCny = Number(d.price_range?.min) || 0;
  const maxCny = Number(d.price_range?.max) || 0;
  if (minCny <= 0) {
    console.warn(`[detail1688] ${offerId} no valid price`);
    return null;
  }
  const priceMin = computePrice(minCny, DEFAULT_PRICING).sellingBdt;
  const priceMax =
    maxCny > minCny
      ? computePrice(maxCny, DEFAULT_PRICING).sellingBdt
      : undefined;
  const oldPrice = Math.round(priceMin * 1.3);

  // Gallery
  const gallery = (d.images ?? [])
    .map((img) => img.fullPathImageURI)
    .filter((u) => u && u.startsWith("http"));

  if (gallery.length === 0) {
    console.warn(`[detail1688] ${offerId} no images`);
    return null;
  }

  const props = variantsRes?.data?.props ?? [];
  const skus = variantsRes?.data?.sku_map ?? [];
  const colorProp = props.find((p) => p.prop === "颜色");
  const sizeProp = props.find((p) => p.prop === "尺码");

  // Specs from details response
  const rawAttributeList = d.attributes ?? [];
  const rawSpecEntries = rawAttributeList
    .filter(
      (a) =>
        a.name !== "颜色" &&
        a.name !== "尺码" &&
        a.value &&
        a.value !== "/" &&
        a.value !== "-"
    )
    .map((a) => ({ name: a.name, value: a.value }));

  // Parallel batch translations
  const [titleEn, supplierEn, colorLabels, specNames, specValues] =
    await Promise.all([
      translateSafe(d.title),
      translateSafe(d.seller?.company_name ?? ""),
      Promise.all(
        (colorProp?.value ?? []).map(async (raw) => {
          const direct = translateColorName(raw.name);
          if (direct) return direct;
          return translateSafe(raw.name);
        })
      ),
      translateAll(rawSpecEntries.map((s) => s.name)),
      translateAll(rawSpecEntries.map((s) => s.value)),
    ]);

  if (!titleEn) {
    console.warn(`[detail1688] ${offerId} title translation failed`);
    return null;
  }

  // Colors
  const colors: { id: string; label: string; hex: string; image?: string }[] = [];
  if (colorProp) {
    for (let i = 0; i < colorProp.value.length; i++) {
      const label = colorLabels[i];
      if (!label) continue;
      colors.push({
        id: colorIdFromLabel(label, i),
        label,
        hex: hexFromName(label),
        image: colorProp.value[i].imageUrl,
      });
    }
  }

  // Sizes
  let sizes: string[] = [];
  if (sizeProp && sizeProp.value.length > 0) {
    sizes = sizeProp.value.map((v) => v.name.trim()).filter(Boolean);
  }

  // Variants
  const builtVariants = skus.map((sku) => {
    const parts = sku.specAttrs.split(">").map((p) => p.trim());
    const rawColor = parts[0] ?? "";
    const rawSize = parts[1] ?? "";

    const colorMatch = colors.find(
      (c) =>
        c.label === rawColor ||
        c.label.includes(rawColor) ||
        rawColor.includes(c.label)
    );

    const priceCny = sku.priceAmount || 0;
    const priceBdt = priceCny
      ? computePrice(priceCny, DEFAULT_PRICING).sellingBdt
      : undefined;

    return {
      colorId: colorMatch?.id,
      size: rawSize || undefined,
      priceCny,
      price: priceBdt,
      stock: sku.canBookCount,
      skuId: String(sku.skuId),
    };
  });

  // Specs
  const specs: { name: string; value: string }[] = [];
  for (let i = 0; i < rawSpecEntries.length; i++) {
    const nameEn = specNames[i];
    const valueEn = specValues[i];
    if (nameEn && valueEn) {
      specs.push({ name: nameEn, value: valueEn });
    }
  }

  // Weight
  const weightKg =
    d.weight_measurements?.unit_weight_kg &&
    d.weight_measurements.unit_weight_kg > 0
      ? d.weight_measurements.unit_weight_kg
      : d.weight_measurements?.pieces?.[0]?.weight_kg;

  // Stock
  const stockCount =
    skus.length > 0
      ? skus.reduce((sum, s) => sum + (s.canBookCount || 0), 0)
      : 9999;

  // Features
  const features: { icon: string; label: string }[] = [];
  features.push({ icon: "📦", label: "MOQ 1" });
  if (weightKg) features.push({ icon: "⚖️", label: `${weightKg}kg` });

  const priceCnyMax = maxCny > minCny ? maxCny : undefined;

  const result: Detail1688Product = {
    id: offerId,
    title: titleEn.slice(0, 120),
    subtitle: supplierEn || "China",
    price: priceMin,
    priceMax,
    priceCnyMin: minCny,
    priceCnyMax,
    oldPrice,
    discount: 20,
    rating: 4.5,
    reviews: d.sale_num ?? 0,
    image: gallery[0],
    gallery,
    colors,
    sizes,
    variants: builtVariants.length > 0 ? builtVariants : undefined,
    specs: specs.length > 0 ? specs : undefined,
    inStock: true,
    stockCount,
    features,
    description: titleEn,
    sourceUrl: `https://detail.1688.com/offer/${offerId}.html`,
    moq: 1,
    supplierName: supplierEn || "1688 Supplier",
    priceOriginalCny: minCny,
    weightKg: weightKg ?? undefined,
    isLive: true,
  };

  console.log(
    `[detail1688] ✓ ${offerId}: ${colors.length} colors, ${sizes.length} sizes, ${specs.length} specs, ${gallery.length} images — total ${Date.now() - t0}ms`
  );

  return result;
}