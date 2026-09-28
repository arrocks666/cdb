// middleware.ts
// Protects /admin-panel/* routes (except /admin-panel/login)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "cdb_admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /admin-panel routes
  if (!pathname.startsWith("/admin-panel")) {
    return NextResponse.next();
  }

  // Allow the login page itself
  if (pathname === "/admin-panel/login") {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // Redirect to login
    const loginUrl = new URL("/admin-panel/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Token presence is verified deeper in each page.
  // (Middleware runs on the edge, can't use node crypto.)
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin-panel/:path*"],
};