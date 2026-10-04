import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { createJob } from "@/lib/firestoreBulkJobs";
import { allSubcategories } from "@/lib/categories";
import { runSearchStep } from "@/lib/bulkImport";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/admin/bulk-import/start
 * Body: { categoryId, subcategoryId, targetCount }
 * Creates a job and kicks off the search step (fire-and-forget).
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const categoryId = String(body.categoryId ?? "").trim();
    const subcategoryId = String(body.subcategoryId ?? "").trim();
    const targetCount = Number(body.targetCount ?? 30);

    if (!categoryId || !subcategoryId) {
      return Response.json(
        { error: "categoryId and subcategoryId required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(targetCount) || targetCount < 1 || targetCount > 500) {
      return Response.json(
        { error: "targetCount must be between 1 and 500" },
        { status: 400 }
      );
    }

    const sub = allSubcategories.find((s) => s.id === subcategoryId);
    if (!sub) {
      return Response.json(
        { error: `Subcategory "${subcategoryId}" not found` },
        { status: 404 }
      );
    }

    if (sub.categoryId !== categoryId) {
      return Response.json(
        { error: "Subcategory does not belong to category" },
        { status: 400 }
      );
    }

    // ✅ Pass both English + Chinese keywords to job
    const job = await createJob(
      categoryId,
      subcategoryId,
      sub.keyword,
      sub.keywordCN,
      targetCount
    );

    // Fire-and-forget the search step
       runSearchStep(job.id).catch((err: unknown) => {
      console.error(`[bulk-import/start] search failed for ${job.id}:`, err);
    });

    return Response.json({
      jobId: job.id,
      status: "queued",
    });
  } catch (err: any) {
    console.error("bulk-import/start error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}