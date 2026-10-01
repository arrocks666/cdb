// lib/imageSearchJobs.ts
// In-memory job store for progressive image search.

import type { LiveProduct } from "./live-search";

export type JobStatus =
  | "pending"
  | "searching"
  | "loading"
  | "done"
  | "error";

export type ImageSearchJob = {
  id: string;
  status: JobStatus;
  createdAt: number;
  imageUrl?: string;
  offerIds: string[];
  products: LiveProduct[];
  error?: string;
  totalExpected: number;
};

const jobs = new Map<string, ImageSearchJob>();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 60 * 1000);

export function createJob(): ImageSearchJob {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job: ImageSearchJob = {
    id,
    status: "pending",
    createdAt: Date.now(),
    offerIds: [],
    products: [],
    totalExpected: 0,
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): ImageSearchJob | undefined {
  return jobs.get(id);
}

export function updateJob(
  id: string,
  patch: Partial<ImageSearchJob>
): ImageSearchJob | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  const updated = { ...job, ...patch };
  jobs.set(id, updated);
  return updated;
}

export function pushProduct(id: string, product: LiveProduct): void {
  const job = jobs.get(id);
  if (!job) return;
  if (job.products.find((p) => p.id === product.id)) return;
  job.products.push(product);
  jobs.set(id, job);
}