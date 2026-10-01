import { NextRequest } from "next/server";
import { getJob } from "@/lib/imageSearchJobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({
    id: job.id,
    status: job.status,
    offerIds: job.offerIds,
    totalExpected: job.totalExpected,
    products: job.products,
    error: job.error,
  });
}