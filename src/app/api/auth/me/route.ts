import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:8000";

    // If access token is missing, attempt refresh using refresh token
    if (!accessToken && refreshToken) {
      const refreshRes = await fetch(`${apiBase}/api/auth/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
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

    let meRes = await fetch(`${apiBase}/api/auth/me/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    // If access token expired, try refreshing once
    if (meRes.status === 401 && refreshToken) {
      const refreshRes = await fetch(`${apiBase}/api/auth/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json().catch(() => null);
        if (refreshData?.access) {
          accessToken = refreshData.access;
          meRes = await fetch(`${apiBase}/api/auth/me/`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
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
    const message = error instanceof Error ? error.message : "Authentication check failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
