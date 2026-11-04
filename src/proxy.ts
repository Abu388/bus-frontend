import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that do not require authentication
const PUBLIC_PATHS = ["/login", "/api/auth", "/dev/theme", "/api/geo"];

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

  // Check authentication via Django JWT cookies
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const isAuthenticated = Boolean(accessToken || refreshToken);

  // Handle root path: redirect to /dashboard if authenticated, else /login
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If already logged in and visiting /login, redirect to /dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Check if current path is public
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
  if (isPublic) {
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!isAuthenticated) {
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
     * - api routes (handled by their own route handlers with proper 401s)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, images, svgs
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
