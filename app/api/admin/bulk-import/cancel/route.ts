import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { requestCancel } from "@/lib/firestoreBulkJobs";

export const runtime = "nodejs";

/**
 * POST /api/admin/bulk-import/cancel
 * Body: { jobId }
 * Sets cancelRequested = true. Next /run call will mark job as cancelled.
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

    await requestCancel(jobId);

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("bulk-import/cancel error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}