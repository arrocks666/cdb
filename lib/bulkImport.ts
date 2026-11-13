// lib/bulkImport.ts
import { fetchPizani1688 } from "./pizani1688";
import { db } from "./firebase";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { categories } from "./categories";

// ✅ Helper to recursively remove undefined values that break Firestore
function deepClean(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => deepClean(v)).filter((v) => v !== undefined);
  }
  if (obj !== null && typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      const cleaned = deepClean(obj[key]);
      if (cleaned !== undefined) {
        newObj[key] = cleaned;
      }
    }
    return newObj;
  }
  return obj;
}

// ✅ Use the correct BlueskyScraper Actor for keyword search
async function searchProductsByKeyword(keyword: string, count: number) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN");

  const ACTOR_ID = "blueskyscraper~1688-scraper"; 
  const runUrl = `https://api.apify.com/v2/actors/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&waitForFinish=60`;
  
  const input = {
    keywords: [keyword],
    maxResults: count,
  };

  console.log(`[bulk-import] Searching "${keyword}" via ${ACTOR_ID}...`);
  
  const response = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search actor failed: ${text}`);
  }

  return await response.json() as any[];
}

export async function runBulkImport(
  jobId: string,
  categoryId: string,
  subcategoryId: string,
  targetCount: number
) {
  const jobRef = doc(db, "bulk_import_jobs", jobId);

  try {
    const cat = categories.find((c) => c.id === categoryId);
    const sub = cat?.subcategories.find((s) => s.id === subcategoryId);
    if (!sub) throw new Error("Invalid category/subcategory");
    
    const keyword = sub.keywordCN || sub.keyword;

    await updateDoc(jobRef, { status: "searching" });

    // 1. Search using the correct Actor
    const searchResults = await searchProductsByKeyword(keyword, targetCount + 5);
    
    if (searchResults.length === 0) {
      throw new Error(`No products found for "${keyword}". Try a different category.`);
    }

    const itemsToImport = searchResults.slice(0, targetCount);

    await updateDoc(jobRef, { status: "loading", totalExpected: itemsToImport.length });

    let imported = 0;
    let failed = 0;

    for (const item of itemsToImport) {
      try {
        // 2. Extract the offerId from the URL
        let offerId = "";
        
        if (item.url) {
          const match = String(item.url).match(/offer\/(\d+)/);
          if (match) offerId = match[1];
        }
        
        if (!offerId) {
          offerId = String(item.offerId || item.id || "");
        }

        if (!offerId) {
          failed++;
          await updateDoc(jobRef, { failed });
          continue;
        }

        // 3. Fetch full variants (colors, sizes, prices) using Pizani
        const detail = await fetchPizani1688(offerId);
        
        if (!detail) {
          failed++;
          await updateDoc(jobRef, { failed });
          continue;
        }

        const productRef = doc(db, "products", detail.id);
        
        const rawProductData = {
          ...detail,
          categoryId,
          subcategoryId,
          isTrending: true,
          isLive: false,
          // ✅ FIX: Save a plain number timestamp instead of serverTimestamp
          // This makes the 24-hour filter work perfectly
          savedAt: Date.now(), 
        };
        
        // 4. Clean undefined values and save
        const productData = deepClean(rawProductData);
        await setDoc(productRef, productData, { merge: true });

        imported++;
        await updateDoc(jobRef, { imported });

        // Small delay to avoid Apify rate limits
        await new Promise(r => setTimeout(r, 1500));

      } catch (err: any) {
        console.error(`Failed to import item:`, err.message);
        failed++;
        await updateDoc(jobRef, { failed });
      }
    }

    await updateDoc(jobRef, {
      status: "done",
      imported,
      failed,
      completedAt: serverTimestamp(),
    });

  } catch (err: any) {
    console.error("Bulk import failed:", err);
    await updateDoc(jobRef, {
      status: "error",
      error: err.message || "Unknown error",
    });
  }
}