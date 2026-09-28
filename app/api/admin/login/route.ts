import { NextRequest } from "next/server";
import {
  verifyCredentials,
  createSessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return Response.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    const valid = verifyCredentials(username, password);

    if (!valid) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken();

    const response = Response.json({ success: true });

    // Set HTTP-only cookie
    response.headers.append(
      "Set-Cookie",
      `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${ADMIN_COOKIE_MAX_AGE}; HttpOnly; SameSite=Strict${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return response;
  } catch (err: any) {
    console.error("Admin login error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}