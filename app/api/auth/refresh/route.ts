import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  verifySessionToken,
  createSessionToken,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token provided" }, { status: 401 });
  }

  const payload = await verifySessionToken(refreshToken);
  if (!payload || !payload.user || payload.user.role !== "admin") {
    return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }

  // Issue new session token
  const newSessionToken = await createSessionToken(payload.user, 7 * 24 * 60 * 60);
  const response = NextResponse.json({ success: true, user: payload.user });

  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE_NAME, newSessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
