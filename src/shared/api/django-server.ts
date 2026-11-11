import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_TIMEOUT_MS, buildApiUrl } from "./server";

export interface DjangoSession {
  accessToken?: string;
  refreshToken?: string;
  newAccessToken?: string;
}

export class UpstreamError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? extractErrorMessage(body) ?? `Upstream request failed (${status})`);
    this.name = "UpstreamError";
    this.status = status;
    this.body = body;
  }
}

export function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return typeof body === "string" && body.trim() ? body.trim() : undefined;
  }

  // DRF serializes some exceptions (e.g. ValidationError raised by
  // perform_destroy) as a top-level array of messages.
  if (Array.isArray(body)) {
    for (const item of body) {
      const message = extractErrorMessage(item);
      if (message) return message;
    }
    return undefined;
  }

  const record = body as Record<string, unknown>;
  for (const key of ["detail", "message", "error"]) {
    if (typeof record[key] === "string" && (record[key] as string).trim()) {
      return (record[key] as string).trim();
    }
  }

  if (Array.isArray(record.non_field_errors) && record.non_field_errors.length > 0) {
    return String(record.non_field_errors[0]);
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export async function getDjangoSession(): Promise<DjangoSession> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get("access_token")?.value,
    refreshToken: cookieStore.get("refresh_token")?.value,
  };
}

export function isAuthenticated(session: DjangoSession): boolean {
  return Boolean(session.accessToken || session.refreshToken);
}

async function refreshAccessToken(session: DjangoSession): Promise<boolean> {
  if (!session.refreshToken) return false;

  try {
    const response = await fetch(buildApiUrl("/api/auth/refresh/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh: session.refreshToken }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!response.ok) return false;
    const data = (await response.json().catch(() => null)) as { access?: string } | null;
    if (!data?.access) return false;

    session.accessToken = data.access;
    session.newAccessToken = data.access;
    return true;
  } catch {
    return false;
  }
}

async function rawDjangoFetch(
  session: DjangoSession,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (session.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(API_TIMEOUT_MS),
  });
}

export async function djangoFetch(
  session: DjangoSession,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let response = await rawDjangoFetch(session, path, init);

  if (response.status === 401 && session.refreshToken) {
    const refreshed = await refreshAccessToken(session);
    if (refreshed) {
      response = await rawDjangoFetch(session, path, init);
    }
  }

  return response;
}

export async function djangoJson<T>(
  session: DjangoSession,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await djangoFetch(session, path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new UpstreamError(response.status, body);
  }

  return body as T;
}

export function applySessionCookie(
  response: NextResponse,
  session: DjangoSession
): NextResponse {
  if (session.newAccessToken) {
    response.cookies.set("access_token", session.newAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
  }
  return response;
}

export function upstreamErrorResponse(
  error: unknown,
  session?: DjangoSession
): NextResponse {
  if (error instanceof UpstreamError) {
    const response = NextResponse.json(
      error.body && typeof error.body === "object"
        ? error.body
        : { message: error.message },
      { status: error.status }
    );
    return session ? applySessionCookie(response, session) : response;
  }

  const response = NextResponse.json(
    {
      message:
        error instanceof Error
          ? error.message
          : "Failed to communicate with backend service.",
    },
    { status: 502 }
  );
  return session ? applySessionCookie(response, session) : response;
}
