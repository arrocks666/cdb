import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  verifySessionToken,
  ADMIN_COOKIE_NAME,
} from "@/lib/adminAuth";
import { changeAdminPassword } from "@/lib/adminPassword";

export const runtime = "nodejs";

/**
 * POST /api/admin/password
 * Body: { oldPassword, newPassword }
 * Requires valid admin cookie session.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check — must be logged-in admin
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!verifySessionToken(token)) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Read body
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return Response.json(
        { error: "Both old and new passwords required" },
        { status: 400 }
      );
    }

    // 3. Change password
    const result = await changeAdminPassword(oldPassword, newPassword);

    if (!result.ok) {
      return Response.json(
        { error: result.error ?? "Failed to change password" },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Password change error:", err);
    return Response.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}