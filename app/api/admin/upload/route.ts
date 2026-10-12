import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

async function uploadToImgBB(file: File): Promise<{ url: string; thumb?: string }> {
  const imgbbForm = new FormData();
  imgbbForm.append("image", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s

  try {
    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: "POST",
        body: imgbbForm,
        signal: controller.signal,
      }
    );

    const data = await res.json();

    if (!res.ok || !data?.data?.url) {
      const msg =
        data?.error?.message ||
        `ImgBB returned status ${res.status}`;
      throw new Error(msg);
    }

    return {
      url: data.data.url as string,
      thumb: data.data.thumb?.url as string | undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!IMGBB_API_KEY) {
      return Response.json(
        { error: "IMGBB_API_KEY not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return Response.json({ error: "No image uploaded" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json(
        { error: "Image too large. Max 10MB." },
        { status: 400 }
      );
    }

    // Try up to 2 times with a small delay between attempts
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await uploadToImgBB(file);
        return Response.json(result);
      } catch (err: any) {
        lastError = err;
        console.error(`ImgBB upload attempt ${attempt} failed:`, err.message);

        // If it's a timeout/network issue, wait 1s and retry
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    return Response.json(
      { error: lastError?.message ?? "Upload failed after retries" },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("Upload error:", err);
    return Response.json(
      { error: err?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}