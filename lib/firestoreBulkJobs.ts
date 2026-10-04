// lib/firestoreBulkJobs.ts
// Bulk import job state in Firestore.
// Collection: bulkImportJobs/{jobId}

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "bulkImportJobs";

export type BulkJobStatus =
  | "queued"
  | "searching"
  | "loading"
  | "done"
  | "error"
  | "cancelled";

export type BulkJobItem = {
  offerId: string;
  status: "pending" | "imported" | "failed";
  error?: string;
  salesCount?: number;
};

export type BulkJob = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  keyword: string;          // English (display)
  keywordCN: string;        // ✅ Chinese (for actual parsebird search)
  targetCount: number;
  status: BulkJobStatus;
  totalExpected: number;
  imported: number;
  failed: number;
  skipped: number;
  cursor: number;
  items: BulkJobItem[];
  error?: string;
  cancelRequested: boolean;
  startedAt: number;
  updatedAt?: unknown;
  finishedAt?: number;
};

// ---------- CRUD ----------

export async function createJob(
  categoryId: string,
  subcategoryId: string,
  keyword: string,
  keywordCN: string,
  targetCount: number
): Promise<BulkJob> {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  const job: BulkJob = {
    id,
    categoryId,
    subcategoryId,
    keyword,
    keywordCN,
    targetCount,
    status: "queued",
    totalExpected: 0,
    imported: 0,
    failed: 0,
    skipped: 0,
    cursor: 0,
    items: [],
    cancelRequested: false,
    startedAt: now,
  };

  const ref = doc(db, COLLECTION, id);
  await setDoc(ref, {
    ...job,
    updatedAt: serverTimestamp(),
  });

  return job;
}

export async function getJob(jobId: string): Promise<BulkJob | null> {
  try {
    const ref = doc(db, COLLECTION, jobId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<BulkJob, "id">) };
  } catch (err) {
    console.error(`[getJob] failed for ${jobId}:`, err);
    return null;
  }
}

export async function updateJob(
  jobId: string,
  patch: Partial<BulkJob>
): Promise<void> {
  const ref = doc(db, COLLECTION, jobId);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function markJobDone(jobId: string): Promise<void> {
  const ref = doc(db, COLLECTION, jobId);
  await updateDoc(ref, {
    status: "done",
    finishedAt: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

export async function markJobError(
  jobId: string,
  error: string
): Promise<void> {
  const ref = doc(db, COLLECTION, jobId);
  await updateDoc(ref, {
    status: "error",
    error,
    finishedAt: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

export async function markJobCancelled(jobId: string): Promise<void> {
  const ref = doc(db, COLLECTION, jobId);
  await updateDoc(ref, {
    status: "cancelled",
    finishedAt: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

export async function requestCancel(jobId: string): Promise<void> {
  const ref = doc(db, COLLECTION, jobId);
  await updateDoc(ref, {
    cancelRequested: true,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJob(jobId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, jobId));
  } catch (err) {
    console.error(`[deleteJob] failed for ${jobId}:`, err);
  }
}