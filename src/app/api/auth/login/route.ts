import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body ?? {};

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Username/email/phone and password are required." },
        { status: 400 }
      );
    }

    const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:8000";

    // Call Django REST backend endpoint
    let djangoResponse: Response;
    try {
      djangoResponse = await fetch(`${apiBase}/api/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });
    } catch {
      return NextResponse.json(
        { message: "Unable to connect to the authentication server. Please try again later." },
        { status: 503 }
      );
    }

    const data = await djangoResponse.json().catch(() => null);

    if (!djangoResponse.ok) {
      const message =
        data?.detail ||
        data?.error ||
        data?.message ||
        "Invalid credentials. Please verify your identifier and password.";
      return NextResponse.json({ message, ...data }, { status: djangoResponse.status });
    }

    const user = data?.user;
    if (!user) {
      return NextResponse.json(
        { message: "Invalid response from authentication server." },
        { status: 502 }
      );
    }

    // Role check: Admin only portal
    if (user.role !== "admin") {
      return NextResponse.json(
        {
          message:
            "Use the mobile app. This web portal is restricted to system administrators.",
        },
        { status: 403 }
      );
    }

    // Admin authenticated - return safe user profile to browser (no tokens exposed)
    const clientUser = {
      id: user.id,
      role: user.role,
      full_name: user.full_name || user.username,
      username: user.username,
      email: user.email,
      phone: user.phone,
    };

    const response = NextResponse.json({ user: clientUser }, { status: 200 });

    const isProd = process.env.NODE_ENV === "production";

    // Store tokens in httpOnly cookies
    if (data.access) {
      response.cookies.set("access_token", data.access, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
        maxAge: 60 * 60, // 1 hour
      });
    }

    if (data.refresh) {
      response.cookies.set("refresh_token", data.refresh, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
