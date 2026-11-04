import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

interface RouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";

async function forwardRequest(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { path } = await context.params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // Build target URL preserving trailing slash
  const joinedPath = path && path.length > 0 ? path.join("/") : "";
  let targetUrl = joinedPath
    ? `${API_BASE_URL}/api/${joinedPath}/`
    : `${API_BASE_URL}/api/`;

  const search = request.nextUrl.search;
  if (search) {
    targetUrl += search;
  }

  const method = request.method;

  // Prepare outgoing headers
  const outgoingHeaders = new Headers();
  outgoingHeaders.set("Accept", "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) {
    outgoingHeaders.set("Content-Type", contentType);
  }

  if (accessToken) {
    outgoingHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  // Read request body if present
  let body: BodyInit | undefined = undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.text();
  }

  // Execute request against Django backend
  let backendResponse: Response;
  try {
    backendResponse = await fetch(targetUrl, {
      method,
      headers: outgoingHeaders,
      body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to communicate with backend service. Server may be starting up.",
        error: error instanceof Error ? error.message : "Network error",
      },
      { status: 502 }
    );
  }

  // Handle 401: Refresh token and retry once
  let newAccessToken: string | null = null;
  if (backendResponse.status === 401 && refreshToken) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json().catch(() => null);
        if (refreshData?.access) {
          newAccessToken = refreshData.access;
          outgoingHeaders.set("Authorization", `Bearer ${newAccessToken}`);

          // Retry the original request
          backendResponse = await fetch(targetUrl, {
            method,
            headers: outgoingHeaders,
            body,
          });
        }
      }
    } catch {
      // Refresh request failed, proceed with original 401 response
    }
  }

  // If still 401, clear credentials
  if (backendResponse.status === 401) {
    const errorBody = await backendResponse.text();
    const res = new NextResponse(errorBody, {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
    res.cookies.delete("access_token");
    res.cookies.delete("refresh_token");
    return res;
  }

  // Forward response body and status
  const responseData = await backendResponse.text();
  const respContentType = backendResponse.headers.get("content-type") || "application/json";

  const nextResponse = new NextResponse(responseData, {
    status: backendResponse.status,
    headers: {
      "Content-Type": respContentType,
    },
  });

  // If refreshed, set new access_token cookie
  if (newAccessToken) {
    nextResponse.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  return nextResponse;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forwardRequest(request, context);
}
