import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_TIMEOUT_MS, buildApiUrl } from "@/shared/api/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // If access token is missing, attempt refresh using refresh token
    if (!accessToken && refreshToken) {
      const refreshRes = await fetch(buildApiUrl("/api/auth/refresh/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json().catch(() => null);
        if (refreshData?.access) {
          accessToken = refreshData.access;
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    let meRes = await fetch(buildApiUrl("/api/auth/me/"), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    // If access token expired, try refreshing once
    if (meRes.status === 401 && refreshToken) {
      const refreshRes = await fetch(buildApiUrl("/api/auth/refresh/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json().catch(() => null);
        if (refreshData?.access) {
          accessToken = refreshData.access;
          meRes = await fetch(buildApiUrl("/api/auth/me/"), {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
          });
        }
      }
    }

    if (!meRes.ok) {
      const response = NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    }

    const userData = await meRes.json();
    const response = NextResponse.json({ user: userData });

    // If accessToken was refreshed during this call, update cookie
    if (accessToken && accessToken !== cookieStore.get("access_token")?.value) {
      response.cookies.set("access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error("[auth/me] Failed to verify session", {
      url: buildApiUrl("/api/auth/me/"),
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    });
    const message = error instanceof Error ? error.message : "Authentication check failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
