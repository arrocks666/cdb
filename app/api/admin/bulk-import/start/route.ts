import { NextRequest } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { runBulkImport } from "@/lib/bulkImport";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, subcategoryId, targetCount } = body;

    if (!categoryId || !subcategoryId || !targetCount) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Create a job record in Firestore
    const jobRef = await addDoc(collection(db, "bulk_import_jobs"), {
      categoryId,
      subcategoryId,
      targetCount,
      status: "queued",
      imported: 0,
      failed: 0,
      totalExpected: targetCount,
      createdAt: serverTimestamp(),
    });

    // 2. Start the import process in the background
    runBulkImport(jobRef.id, categoryId, subcategoryId, targetCount).catch(console.error);

    return Response.json({ jobId: jobRef.id });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}