import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { API_TIMEOUT_MS, buildApiUrl } from "@/shared/api/server";

interface RouteContext {
  params: Promise<{
    path?: string[];
  }>;
}

async function forwardRequest(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { path } = await context.params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // Build upstream Django URL: Django REST Framework strictly requires trailing slashes.
  // Upstream format: ${API_BASE_URL}/api/${pathSegments.join('/')}/${search}
  const rawSegments = path ?? [];
  const cleanSegments = rawSegments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const search = request.nextUrl.search ?? "";
  const upstreamPath = cleanSegments.length > 0
    ? `/api/${cleanSegments.join("/")}/${search}`
    : `/api/${search}`;
  const targetUrl = buildApiUrl(upstreamPath);

  const method = request.method;

  // Prepare outgoing headers
  const outgoingHeaders = new Headers();
  outgoingHeaders.set("Accept", "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) {
    outgoingHeaders.set("Content-Type", contentType);
  }

  // Use session cookie if present, otherwise pass incoming Authorization header
  if (accessToken) {
    outgoingHeaders.set("Authorization", `Bearer ${accessToken}`);
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      outgoingHeaders.set("Authorization", authHeader);
    }
  }

  // Read request body if present
  let body: BodyInit | undefined = undefined;
  if (method !== "GET" && method !== "HEAD") {
    const text = await request.text();
    if (text && text.length > 0) {
      body = text;
      if (!outgoingHeaders.has("Content-Type")) {
        outgoingHeaders.set("Content-Type", "application/json");
      }
    }
  }

  // Execute request against Django backend with a 65-second timeout
  let backendResponse: Response;
  try {
    backendResponse = await fetch(targetUrl, {
      method,
      headers: outgoingHeaders,
      body,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[api/proxy] Failed to reach backend service", {
      url: targetUrl,
      method,
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    });
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
      const refreshResponse = await fetch(buildApiUrl("/api/auth/refresh/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
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
            signal: AbortSignal.timeout(API_TIMEOUT_MS),
          });
        }
      }
    } catch (error) {
      console.error("[api/proxy] Token refresh failed", {
        url: buildApiUrl("/api/auth/refresh/"),
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error.cause : undefined,
      });
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

  // Django returns 204 No Content for successful DELETEs. A Response with a
  // non-null body is invalid for 204, and attempting to read/parse an empty
  // body makes successful deletes look like failures. Short-circuit here.
  if (
    backendResponse.status === 204 ||
    backendResponse.headers.get("content-length") === "0"
  ) {
    const emptyResponse = new NextResponse(null, { status: 204 });

    if (newAccessToken) {
      emptyResponse.cookies.set("access_token", newAccessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60,
      });
    }

    return emptyResponse;
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
