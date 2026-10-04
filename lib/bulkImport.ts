// lib/bulkImport.ts
// Bulk import orchestrator. Runs one batch per invocation.
// Client polls /api/admin/bulk-import/run repeatedly to keep job moving.

import {
  getJob,
  updateJob,
  markJobDone,
  markJobError,
  markJobCancelled,
} from "./firestoreBulkJobs";
import { parsebirdSearch } from "./parsebird1688";
import { fetchPizani1688 } from "./pizani1688";
import { saveLiveProduct } from "./firestoreLiveProducts";
import type { LiveProduct } from "./liveProduct";

const BATCH_SIZE = 20;

// ---------- STEP A: SEARCH ----------

export async function runSearchStep(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  if (job.cancelRequested) {
    await markJobCancelled(jobId);
    return;
  }

  try {
    await updateJob(jobId, { status: "searching" });

    const fetchCount = Math.min(job.targetCount + 10, 200);

    // ✅ Step 1: Try Chinese keyword first (works best on 1688)
    const cnKeyword = job.keywordCN || job.keyword;
    console.log(
      `[bulkImport ${jobId}] trying CN keyword: "${cnKeyword}"`
    );
    let listings = await parsebirdSearch(cnKeyword, fetchCount);

    // ✅ Step 2: If CN returned 0, try English keyword as fallback
    if (listings.length === 0 && job.keyword && job.keyword !== cnKeyword) {
      console.log(
        `[bulkImport ${jobId}] CN returned 0 — trying EN keyword: "${job.keyword}"`
      );
      listings = await parsebirdSearch(job.keyword, fetchCount);
    }

    // ✅ Step 3: If both returned 0, try a broader Chinese keyword
    if (listings.length === 0 && cnKeyword) {
      const broader = getBroaderKeyword(cnKeyword);
      if (broader && broader !== cnKeyword) {
        console.log(
          `[bulkImport ${jobId}] EN also returned 0 — trying broader CN: "${broader}"`
        );
        listings = await parsebirdSearch(broader, fetchCount);
      }
    }

    console.log(
      `[bulkImport ${jobId}] search final: ${listings.length} products`
    );

    // ✅ Check cancel again — admin might have cancelled during search
    const refreshed = await getJob(jobId);
    if (refreshed?.cancelRequested) {
      await markJobCancelled(jobId);
      return;
    }

    if (listings.length === 0) {
      await markJobError(
        jobId,
        `No products found for "${job.keyword}" (tried CN: ${cnKeyword}). Try a different subcategory.`
      );
      return;
    }

    const trimmed = listings.slice(0, job.targetCount);
    const items = trimmed.map((l) => ({
      offerId: l.offerId,
      status: "pending" as const,
      salesCount: l.salesCount,
    }));

    await updateJob(jobId, {
      status: "loading",
      totalExpected: items.length,
      items,
      cursor: 0,
    });

    console.log(
      `[bulkImport ${jobId}] search done — ${items.length} offerIds queued`
    );
  } catch (err: any) {
    console.error(`[bulkImport ${jobId}] search failed:`, err);
    await markJobError(jobId, err?.message ?? "Search failed");
  }
}

// ---------- HELPER: broader keyword fallback ----------

// Some specific CN keywords return 0 results on 1688.
// This maps them to broader terms that are more likely to have inventory.
function getBroaderKeyword(cnKeyword: string): string | null {
  const map: Record<string, string> = {
    // Apparel
    "女士上衣": "女士衬衫",      // tops → women's shirt
    "女士凉鞋": "女式凉鞋",      // sandals → women's sandals
    "女士夹克": "女士外套",      // jacket → women's coat
    "男士夹克": "男士外套",      // men jacket → men coat
    "女士T恤": "女士短袖",      // women tshirt → women's short sleeve
    "男士T恤": "男士短袖",      // men tshirt → men's short sleeve
    "女士连衣裙": "连衣裙",      // women dress → dress
    "女士长款上衣": "女士上衣",  // kurti → top

    // Bags
    "女士手提包": "女包",        // handbag → women's bag
    "双肩包": "背包",            // backpack → backpack
    "钱包": "钱包",              // wallet ok

    // Beauty
    "面霜": "护肤品",            // face cream → skincare
    "化妆品": "化妆品",           // makeup ok
    "香水": "香水",              // perfume ok

    // Home
    "收纳盒": "收纳盒",           // storage box ok
    "厨房工具": "厨房用品",       // kitchen tool → kitchen supplies
    "床上用品": "床上用品",       // bedding ok

    // Appliances
    "迷你风扇": "小风扇",         // mini fan → small fan
    "LED灯": "LED灯",            // led light ok
    "小家电": "厨房小家电",       // small appliance → kitchen small appliance

    // Baby
    "婴儿服装": "婴儿童装",       // baby clothing → baby clothing
    "尿布": "纸尿裤",            // diapers → baby diapers
    "儿童玩具": "玩具",           // kids toy → toys

    // Jewelry
    "项链": "项链",              // necklace ok
    "戒指": "戒指",              // ring ok
    "手表": "手表",              // watch ok

    // Kitchen (new category)
    "厨具套装": "厨房用品",       // cookware set → kitchen supplies
    "厨房刀具": "菜刀",           // kitchen knife → chef knife
    "食品保鲜盒": "保鲜盒",       // food storage → storage box

    // Electronics (new)
    "USB数据线": "数据线",        // usb cable → cable
    "移动电源": "充电宝",         // power bank → power bank (CN term)
    "手机支架": "手机架",         // phone holder → phone stand

    // Fitness (new)
    "瑜伽垫": "瑜伽垫",           // yoga mat ok
    "哑铃套装": "哑铃",           // dumbbell set → dumbbell
    "运动水壶": "水壶",           // sports water bottle → bottle
  };

  return map[cnKeyword] ?? null;
}

// ---------- STEP B: LOAD (Pizani per batch) ----------

export async function runLoadBatch(jobId: string): Promise<{
  done: boolean;
  cancelled: boolean;
}> {
  const job = await getJob(jobId);
  if (!job) return { done: true, cancelled: false };

  if (job.cancelRequested || job.status === "cancelled") {
    await markJobCancelled(jobId);
    return { done: true, cancelled: true };
  }

  if (job.status !== "loading") {
    return { done: true, cancelled: false };
  }

  const start = job.cursor;
  const end = Math.min(start + BATCH_SIZE, job.items.length);

  if (start >= job.items.length) {
    await markJobDone(jobId);
    return { done: true, cancelled: false };
  }

  const batch = job.items.slice(start, end);
  console.log(
    `[bulkImport ${jobId}] batch ${start}-${end} (${batch.length} items)`
  );

  const results = await Promise.all(
    batch.map(async (item) => {
      if (job.cancelRequested) {
        return { offerId: item.offerId, status: "skipped" as const };
      }

      try {
        const detail = await fetchPizani1688(item.offerId);
        if (!detail) {
          const retry = await fetchPizani1688(item.offerId);
          if (!retry) {
            return {
              offerId: item.offerId,
              status: "failed" as const,
              error: "Pizani returned no data",
            };
          }
          return await saveProduct(retry, item.offerId);
        }
        return await saveProduct(detail, item.offerId);
      } catch (err: any) {
        return {
          offerId: item.offerId,
          status: "failed" as const,
          error: err?.message ?? "Fetch failed",
        };
      }
    })
  );

  let imported = job.imported;
  let failed = job.failed;

  const updatedItems = [...job.items];
  for (let i = 0; i < batch.length; i++) {
    const idx = start + i;
    const result = results[i];
    if (result.status === "imported") {
      imported++;
      updatedItems[idx] = { ...updatedItems[idx], status: "imported" };
    } else if (result.status === "failed") {
      failed++;
      updatedItems[idx] = {
        ...updatedItems[idx],
        status: "failed",
        error: result.error,
      };
    }
  }

  const newCursor = end;
  const isDone = newCursor >= job.items.length;

  await updateJob(jobId, {
    cursor: newCursor,
    imported,
    failed,
    items: updatedItems,
  });

  if (isDone) {
    await markJobDone(jobId);
    return { done: true, cancelled: false };
  }

  return { done: false, cancelled: false };
}

// ---------- HELPERS ----------

async function saveProduct(
  detail: Awaited<ReturnType<typeof fetchPizani1688>>,
  offerId: string
): Promise<{ offerId: string; status: "imported" | "failed"; error?: string }> {
  if (!detail) {
    return { offerId, status: "failed", error: "No detail" };
  }

  try {
    const live: LiveProduct = {
      id: `live-${detail.id}`,
      title: detail.title,
      subtitle: detail.subtitle,
      price: detail.price,
      priceMax: detail.priceMax,
      priceCnyMin: detail.priceCnyMin,
      priceCnyMax: detail.priceCnyMax,
      oldPrice: detail.oldPrice,
      discount: detail.discount,
      rating: detail.rating,
      reviews: detail.reviews,
      image: detail.image,
      gallery: detail.gallery,
      colors: detail.colors,
      sizes: detail.sizes,
      variants: detail.variants,
      specs: detail.specs,
      inStock: detail.inStock,
      stockCount: detail.stockCount,
      features: detail.features,
      description: detail.description,
      sourceUrl: detail.sourceUrl,
      moq: detail.moq,
      supplierName: detail.supplierName,
      priceOriginalCny: detail.priceOriginalCny,
      isLive: true,
      weightKg: detail.weightKg,
    };

    await saveLiveProduct(live);
    return { offerId, status: "imported" };
  } catch (err: any) {
    return {
      offerId,
      status: "failed",
      error: err?.message ?? "Save failed",
    };
  }
}