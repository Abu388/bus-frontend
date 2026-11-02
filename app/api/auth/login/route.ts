import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth/session";
import { AuthUser } from "@/lib/auth/types";

// Known seed/demo users matching backend models & seed_demo
const DEMO_USERS: (AuthUser & { passwords: string[]; matchIdentifiers: string[] })[] = [
  {
    id: "e1a90c00-0000-4000-a000-000000000001",
    email: "admin@bus.et",
    phone: "+251911000001",
    full_name: "Fleet Administrator",
    role: "admin",
    passwords: ["Password123!", "admin123"],
    matchIdentifiers: ["admin@bus.et", "+251911000001", "0911000001", "admin", "admin_demo"],
  },
  {
    id: "e1a90c00-0000-4000-a000-000000000002",
    email: "cashier1@bus.et",
    phone: "+251911000002",
    full_name: "Addis Cashier",
    role: "casher",
    passwords: ["Password123!"],
    matchIdentifiers: ["cashier1@bus.et", "+251911000002", "0911000002", "cashier1"],
  },
  {
    id: "e1a90c00-0000-4000-a000-000000000004",
    email: "passenger1@bus.et",
    phone: "+251911000004",
    full_name: "Regular Passenger",
    role: "passenger",
    passwords: ["Password123!"],
    matchIdentifiers: ["passenger1@bus.et", "+251911000004", "0911000004", "passenger1"],
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please provide both email/phone and password" },
        { status: 400 }
      );
    }

    const trimmedId = String(identifier).trim().toLowerCase();
    const apiBaseUrl = process.env.API_BASE_URL || "http://127.0.0.1:8000";

    // 1. First attempt to call Django backend endpoint
    let djangoSuccess = false;
    let authUser: AuthUser | null = null;

    try {
      // SimpleJWT or standard DRF token endpoint
      const backendRes = await fetch(`${apiBaseUrl}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedId, password }),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        // If backend returned user details or access token
        djangoSuccess = true;
        authUser = {
          id: data.user?.id || "backend-user",
          email: data.user?.email || trimmedId,
          phone: data.user?.phone || "",
          full_name: data.user?.full_name || "Admin User",
          role: data.user?.role || "admin",
        };
      }
    } catch {
      // Backend not running or endpoint not yet configured
      djangoSuccess = false;
    }

    // 2. If Django endpoint was not reachable / returned 404, check against user registry
    if (!djangoSuccess) {
      const normalizedPhone = trimmedId.startsWith("09")
        ? `+2519${trimmedId.slice(2)}`
        : trimmedId;

      const found = DEMO_USERS.find(
        (u) =>
          u.matchIdentifiers.includes(trimmedId) ||
          u.matchIdentifiers.includes(normalizedPhone) ||
          u.email.toLowerCase() === trimmedId ||
          u.phone === normalizedPhone
      );

      if (!found || !found.passwords.includes(password)) {
        return NextResponse.json(
          { error: "Invalid email/phone or password" },
          { status: 401 }
        );
      }

      authUser = {
        id: found.id,
        email: found.email,
        phone: found.phone,
        full_name: found.full_name,
        role: found.role,
      };
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    // 3. Role enforcement: "Only role 'admin' may enter; other roles see a clear 'use the mobile app' message."
    if (authUser.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Access restricted: Staff and Passenger accounts must use the mobile app. Only administrators can log in to the web platform.",
          role: authUser.role,
        },
        { status: 403 }
      );
    }

    // 4. Create signed session token and store in httpOnly cookies
    const sessionToken = await createSessionToken(authUser, 7 * 24 * 60 * 60);
    const refreshToken = await createSessionToken(authUser, 30 * 24 * 60 * 60);

    const response = NextResponse.json({
      success: true,
      user: authUser,
    });

    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
