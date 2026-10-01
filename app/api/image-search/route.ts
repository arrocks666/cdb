import { NextRequest } from "next/server";
import { createJob, runImageSearchJob } from "@/lib/image-search";
import { hashImage } from "@/lib/imageHashCache";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return Response.json({ error: "No image uploaded" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Image too large. Max 5MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const imageHash = hashImage(base64);
    console.log(`[Image search] hash: ${imageHash}`);

    // Create job and kick off pipeline in background
    const job = createJob();
    console.log(`[Image search] job ${job.id} created`);

    // Fire-and-forget: don't await
    runImageSearchJob(job.id, dataUrl).catch((err) => {
      console.error(`[job ${job.id}] unhandled error:`, err);
    });

    // Return job ID immediately — client polls /api/image-search/status
    return Response.json({ jobId: job.id });
  } catch (err: any) {
    console.error("Image search error:", err);
    return Response.json(
      { error: err.message || "Image search failed" },
      { status: 500 }
    );
  }
}