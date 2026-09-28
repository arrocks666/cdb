import { scrape1688, Raw1688Product } from "../lib/apify-1688";
import { allSubcategories } from "../lib/categories";
import * as fs from "fs";
import * as path from "path";

const CNY_TO_BDT = 17.5;
const PRODUCTS_PER_SUBCATEGORY = 11;

async function translateToEnglish(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data[0]?.map((item: any[]) => item[0]).join("") ?? text;
    return translated;
  } catch {
    return text;
  }
}

function markupMultiplier(bdtPrice: number): number {
  if (bdtPrice < 500) return 1.25;
  if (bdtPrice < 2500) return 1.20;
  if (bdtPrice < 7500) return 1.15;
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
  priceOriginalCny: number;
};

async function transformProduct(
  raw: Raw1688Product,
  categoryId: string,
  subcategoryId: string
): Promise<SiteProduct | null> {
  if (!raw.price || raw.price <= 0) return null;
  if (!raw.imageUrl || !raw.imageUrl.startsWith("http")) return null;

  const englishTitle = await translateToEnglish(raw.title);
  const priceBDT = raw.price * CNY_TO_BDT;
  const multiplier = markupMultiplier(priceBDT);
  const finalPrice = Math.round(priceBDT * multiplier);
  const oldPrice = Math.round(finalPrice * 1.25);
  const moq = raw.minOrderQuantity ?? 1;

  let subtitle = "China";
  if (raw.province && raw.province.trim()) {
    const provinceEn = await translateToEnglish(raw.province);
    subtitle = `${provinceEn} · China`;
  }

  return {
    id: raw.offerId,
    title: englishTitle.slice(0, 80),
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
    features: [
      { icon: "🏭", label: raw.province || "China" },
      { icon: "📦", label: `MOQ ${moq}` },
      { icon: "⭐", label: `${raw.verifiedYears} yrs` },
    ],
    description: englishTitle,
    categoryId,
    subcategoryId,
    sourceUrl: raw.url,
    moq,
    supplierName: raw.supplierName ?? "Unknown",
    priceOriginalCny: raw.price,
  };
}

async function main() {
  console.log("Starting 1688 scrape...\n");
  console.log(`Products per subcategory: ${PRODUCTS_PER_SUBCATEGORY}\n`);

  const allProducts: SiteProduct[] = [];
  const seenIds = new Set<string>();
  let totalScraped = 0;
  const startTime = Date.now();

  for (let i = 0; i < allSubcategories.length; i++) {
    const sub = allSubcategories[i];
    const label = `[${i + 1}/${allSubcategories.length}] ${sub.name}`;

    try {
      console.log(`${label} — searching "${sub.keyword}"...`);
      const raw = await scrape1688(sub.keyword, PRODUCTS_PER_SUBCATEGORY);
      totalScraped += raw.length;

      let added = 0;
      for (const r of raw) {
        if (seenIds.has(r.offerId)) continue;
        const transformed = await transformProduct(r, sub.categoryId, sub.id);
        if (!transformed) continue;
        seenIds.add(r.offerId);
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

  const outPath = path.join(outDir, "products-1688.json");
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