import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

/**
 * POST /api/admin/upload
 * Body: FormData with "image" file
 * Returns: { url: string }
 */
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

    // Build ImgBB request
    const imgbbForm = new FormData();
    imgbbForm.append("image", file);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: "POST",
        body: imgbbForm,
      }
    );

    const data = await res.json();

    if (!res.ok || !data?.data?.url) {
      console.error("ImgBB upload failed:", data);
      return Response.json(
        { error: data?.error?.message || "ImgBB upload failed" },
        { status: 500 }
      );
    }

    return Response.json({
      url: data.data.url as string,
      thumb: data.data.thumb?.url as string | undefined,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return Response.json(
      { error: err?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}