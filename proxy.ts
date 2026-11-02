import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

// Public paths that do not require authentication
const PUBLIC_PATHS = ["/login", "/api/auth", "/dev/theme"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, assets, and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brands") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = false;
  let isAdmin = false;

  if (sessionToken) {
    const payload = await verifySessionToken(sessionToken);
    if (payload && payload.user) {
      isAuthenticated = true;
      isAdmin = payload.user.role === "admin";
    }
  }

  // Handle root path: redirect to /dashboard
  if (pathname === "/") {
    if (isAuthenticated && isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If already logged in as admin and visiting /login, redirect to /dashboard
  if (pathname === "/login") {
    if (isAuthenticated && isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Check if current path is public
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
  if (isPublic) {
    return NextResponse.next();
  }

  // All other routes require admin authentication
  if (!isAuthenticated || !isAdmin) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth routes (handled by Next route handlers)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, images, svgs
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
