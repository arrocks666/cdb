import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { getJob } from "@/lib/firestoreBulkJobs";

export const runtime = "nodejs";

/**
 * GET /api/admin/bulk-import/status?jobId=xxx
 * Returns current job status.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get("jobId") ?? "";
    if (!jobId) {
      return Response.json({ error: "jobId required" }, { status: 400 });
    }

    const job = await getJob(jobId);
    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    return Response.json(job);
  } catch (err: any) {
    console.error("bulk-import/status error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}