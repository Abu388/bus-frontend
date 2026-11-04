import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token provided." }, { status: 401 });
    }

    const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:8000";

    const res = await fetch(`${apiBase}/api/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.access) {
      const response = NextResponse.json(
        { message: "Session expired. Please log in again." },
        { status: 401 }
      );
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("access_token", data.access, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    const response = NextResponse.json({ message }, { status: 500 });
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }
}
