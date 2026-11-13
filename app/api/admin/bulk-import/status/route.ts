import { NextRequest } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const snap = await getDoc(doc(db, "bulk_import_jobs", jobId));
    if (!snap.exists()) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }
    
    const data = snap.data();
    
    // ✅ Clean out serverTimestamp placeholders for JSON serialization
    const cleanData = { ...data };
    delete cleanData.createdAt;
    delete cleanData.completedAt;
    
    return Response.json({ id: snap.id, ...cleanData });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}