import { scrapeAlibaba, RawAlibabaProduct } from "../lib/apify";
import { allSubcategories } from "../lib/categories";
import * as fs from "fs";
import * as path from "path";

const USD_TO_BDT = 121;
const PRODUCTS_PER_SUBCATEGORY = 14;

// Return the URL unchanged — the proxy route will handle format conversion
function forceJpeg(url: string | null | undefined): string {
  if (!url) return "";
  return url;
}

function markupMultiplier(usdPrice: number): number {
  if (usdPrice < 10) return 1.25;
  if (usdPrice < 50) return 1.20;
  if (usdPrice < 150) return 1.15;
  return 1.10;
}

type SiteProduct = {
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
};

function transformProduct(
  raw: RawAlibabaProduct,
  categoryId: string,
  subcategoryId: string
): SiteProduct | null {
  if (!raw.price?.min || raw.price.min <= 0) return null;
  if (raw.price.currency !== "USD") return null;

  const usdPrice = raw.price.min;
  const usdOldPrice = raw.price.max ?? raw.price.min;

  const multiplier = markupMultiplier(usdPrice);
  const priceBDT = Math.round(usdPrice * multiplier * USD_TO_BDT);
  const oldPriceBDT = Math.round(usdOldPrice * multiplier * USD_TO_BDT);

  const discount =
    usdOldPrice > usdPrice
      ? Math.round(((usdOldPrice - usdPrice) / usdOldPrice) * 100)
      : 0;

  const moq = raw.order?.minOrderQuantity ?? 1;

  return {
    id: raw.productId,
    title: raw.title.slice(0, 80),
    subtitle: raw.supplier?.name?.slice(0, 40) ?? undefined,
    price: priceBDT,
    oldPrice: oldPriceBDT > priceBDT ? oldPriceBDT : priceBDT,
    discount,
    rating: raw.ratings?.score ?? 4.5,
    reviews: raw.ratings?.count ?? 0,
    image: forceJpeg(raw.media.mainImage),
    gallery: raw.media.images.slice(0, 6).map(forceJpeg),
    colors: [{ id: "default", label: "Default", hex: "#000000" }],
    inStock: true,
    stockCount: 999,
    features: [
      { icon: "🏭", label: raw.supplier?.country ?? "China" },
      { icon: "📦", label: `MOQ ${moq}` },
      { icon: "🚚", label: `${raw.order?.leadTimeDays ?? 7}d` },
    ],
    description: raw.title,
    categoryId,
    subcategoryId,
    sourceUrl: raw.url,
    moq,
    supplierName: raw.supplier?.name ?? "Unknown Supplier",
  };
}

async function main() {
  console.log("Starting Apify scrape for all 35 subcategories...\n");
  console.log(`Products per subcategory: ${PRODUCTS_PER_SUBCATEGORY}\n`);

  const allProducts: SiteProduct[] = [];
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  let totalScraped = 0;
  const startTime = Date.now();

  for (let i = 0; i < allSubcategories.length; i++) {
    const sub = allSubcategories[i];
    const label = `[${i + 1}/${allSubcategories.length}] ${sub.name}`;

    try {
      console.log(`${label} — searching "${sub.keyword}"...`);
      const raw = await scrapeAlibaba(sub.keyword, PRODUCTS_PER_SUBCATEGORY);
      totalScraped += raw.length;

      let added = 0;
      for (const r of raw) {
        if (seenIds.has(r.productId)) continue;
        // Also dedupe by main image URL
        if (r.media?.mainImage && seenImages.has(r.media.mainImage)) continue;
        const transformed = transformProduct(r, sub.categoryId, sub.id);
        if (!transformed) continue;
        seenIds.add(r.productId);
        if (r.media?.mainImage) seenImages.add(r.media.mainImage);
        allProducts.push(transformed);
        added++;
      }

      console.log(`${label} — got ${raw.length}, kept ${added} unique\n`);
    } catch (err: any) {
      console.error(`${label} — FAILED: ${err.message}\n`);
    }
  }

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "products.json");
  fs.writeFileSync(outPath, JSON.stringify(allProducts, null, 2));

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n================================");
  console.log(`Done in ${duration}s`);
  console.log(`Total raw scraped: ${totalScraped}`);
  console.log(`Unique products saved: ${allProducts.length}`);
  console.log(`Output: ${outPath}`);
  console.log("================================");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});