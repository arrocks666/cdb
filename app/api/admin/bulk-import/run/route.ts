import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { getJob } from "@/lib/firestoreBulkJobs";
import { runLoadBatch } from "@/lib/bulkImport";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/admin/bulk-import/run
 * Body: { jobId }
 * Runs ONE batch of load work, then returns.
 * Client polls this repeatedly until job.status === "done".
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const jobId = String(body.jobId ?? "").trim();
    if (!jobId) {
      return Response.json({ error: "jobId required" }, { status: 400 });
    }

    const job = await getJob(jobId);
    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    // If job is in "searching" state (unlikely when client polls /run),
    // let the client know it's still in step A
    if (job.status === "queued" || job.status === "searching") {
      return Response.json({
        status: job.status,
        done: false,
        cancelled: false,
        imported: 0,
        failed: 0,
        totalExpected: 0,
      });
    }

    if (job.status === "done" || job.status === "error" || job.status === "cancelled") {
      return Response.json({
        status: job.status,
        done: true,
        cancelled: job.status === "cancelled",
        imported: job.imported,
        failed: job.failed,
        totalExpected: job.totalExpected,
      });
    }

    // Run one batch of loading
    const result = await runLoadBatch(jobId);

    // Re-fetch updated job
    const updated = await getJob(jobId);

    return Response.json({
      status: updated?.status ?? "loading",
      done: result.done,
      cancelled: result.cancelled,
      imported: updated?.imported ?? 0,
      failed: updated?.failed ?? 0,
      totalExpected: updated?.totalExpected ?? 0,
      cursor: updated?.cursor ?? 0,
    });
  } catch (err: any) {
    console.error("bulk-import/run error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}