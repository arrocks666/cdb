// lib/apify-1688.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_1688_ACTOR_ID = process.env.APIFY_1688_ACTOR_ID;

if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN in .env.local");
if (!APIFY_1688_ACTOR_ID) throw new Error("Missing APIFY_1688_ACTOR_ID in .env.local");

export type Raw1688Product = {
  imageUrl: string;
  title: string;
  url: string;
  offerId: string;
  price: number;
  unit: string;
  minOrderQuantity: number;
  saleQuantity: number;
  gmv30Days: string;
  shopRepurchaseRate: string;
  compositeScore: number;
  supplierName: string;
  supplierType: string;
  verifiedYears: number;
  factoryInspection: string;
  province: string;
  city: string;
  sponsored: string;
  searchTerm: string;
  scrapedAt: string;
  error: string | null;
};

export async function scrape1688(
  keyword: string,
  maxResults: number = 11
): Promise<Raw1688Product[]> {
  const url = `https://api.apify.com/v2/acts/${APIFY_1688_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=300`;

  const body = {
    searchTerms: [keyword],
    maxItems: maxResults,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify 1688 request failed (${response.status}): ${text}`);
  }

  const items = (await response.json()) as Raw1688Product[];
  return items.filter((i) => !i.error);
}