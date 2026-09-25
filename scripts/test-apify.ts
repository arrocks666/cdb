import { scrapeAlibaba } from "../lib/apify";

async function test() {
  console.log("Testing Apify scraper...");
  const results = await scrapeAlibaba("tws earbuds", 3);
  console.log(`Got ${results.length} results`);
  console.log(JSON.stringify(results, null, 2));
}

test().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});