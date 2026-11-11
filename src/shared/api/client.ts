import { AppError, normalizeError } from "./errors";
import { serverWakingStore } from "./waking-store";
import type { RequestOptions } from "./types";

let requestCounter = 0;

/**
 * Normalizes an API path for browser-side requests.
 * Next.js triggers a 308 redirect on endpoints with trailing slashes,
 * so browser-side proxy requests MUST NOT have a trailing slash.
 * e.g., "/buses" -> "/api/proxy/buses"
 *       "/buses/" -> "/api/proxy/buses"
 *       "buses" -> "/api/proxy/buses"
 *       "/api/proxy/buses" -> "/api/proxy/buses"
 *       "/api/proxy/buses/" -> "/api/proxy/buses"
 *       "/api/geo/search" -> "/api/geo/search"
 *       "/api/auth/login" -> "/api/auth/login"
 *       "" or "/" -> "/api/proxy"
 */
export function normalizeApiPath(path: string): string {
  // If already absolute URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Geo, Auth, and atomic route-build BFF routes: preserve without trailing
  // slashes. These are same-origin Next.js route handlers, not Django proxy
  // endpoints.
  if (
    path.startsWith("/api/geo") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/routes")
  ) {
    return path.replace(/\/+$/, "");
  }

  let clean = path.trim();
  if (clean.startsWith("/api/proxy")) {
    clean = clean.replace(/^\/api\/proxy\/?/, "");
  } else if (clean.startsWith("/")) {
    clean = clean.replace(/^\/+/, "");
  }

  // Strip trailing slashes so Next.js does not trigger 308 redirect
  clean = clean.replace(/\/+$/, "");

  if (clean === "") {
    return "/api/proxy";
  }

  return `/api/proxy/${clean}`;
}

export function buildUrlWithParams(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const normalizedPath = normalizeApiPath(path);
  if (!params) return normalizedPath;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) return normalizedPath;

  const separator = normalizedPath.includes("?") ? "&" : "?";
  return `${normalizedPath}${separator}${queryString}`;
}

async function executeWithRetry<T>(
  url: string,
  options: RequestOptions,
  currentAttempt = 0
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const maxRetries = options.retries ?? (method === "GET" ? 2 : 0);
  const timeoutMs = options.timeoutMs ?? 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = options.signal;

  const handleExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", handleExternalAbort);
    }
  }

  const requestId = `req_${++requestCounter}_${Date.now()}`;
  serverWakingStore.startRequest(requestId);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Successful deletes commonly return 204 No Content (or an empty body).
    // Calling response.json() on an empty 204 body throws
    // "Unexpected end of JSON input" and makes a successful delete look like a
    // failure, so short-circuit before any body parsing.
    if (
      response.status === 204 ||
      (response.ok && response.headers.get("content-length") === "0")
    ) {
      return undefined as T;
    }

    let responseData: unknown = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    }

    if (!response.ok) {
      // 5xx errors on idempotent GETs can be retried
      if (
        method === "GET" &&
        response.status >= 500 &&
        currentAttempt < maxRetries
      ) {
        const delay = Math.pow(2, currentAttempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeWithRetry<T>(url, options, currentAttempt + 1);
      }

      throw normalizeError(responseData, response.status);
    }

    return responseData as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof AppError) {
      throw err;
    }

    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));

    // A caller-initiated abort (e.g. a stale builder request) must never be
    // retried or reported as a backend failure.
    if (isAbort && externalSignal?.aborted) {
      throw new AppError({
        status: 499,
        code: "ABORTED",
        message: "Request cancelled.",
        raw: err,
      });
    }

    // Retry network failure or timeout for GET
    if (method === "GET" && currentAttempt < maxRetries) {
      const delay = Math.pow(2, currentAttempt) * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return executeWithRetry<T>(url, options, currentAttempt + 1);
    }

    if (isAbort) {
      throw new AppError({
        status: 408,
        code: "TIMEOUT",
        message: `Request timed out after ${timeoutMs / 1000} seconds. The backend may still be waking up.`,
        raw: err,
      });
    }

    throw normalizeError(err, 500);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", handleExternalAbort);
    serverWakingStore.endRequest(requestId);
  }
}

export const httpClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = buildUrlWithParams(path, options?.params);
    return executeWithRetry<T>(url, { ...options, method: "GET" });
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrlWithParams(path, options?.params);
    const serializedBody =
      body !== undefined && typeof body !== "string" && !(body instanceof FormData)
        ? JSON.stringify(body)
        : (body as BodyInit | undefined);

    return executeWithRetry<T>(url, {
      ...options,
      method: "POST",
      body: serializedBody,
    });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrlWithParams(path, options?.params);
    const serializedBody =
      body !== undefined && typeof body !== "string" && !(body instanceof FormData)
        ? JSON.stringify(body)
        : (body as BodyInit | undefined);

    return executeWithRetry<T>(url, {
      ...options,
      method: "PUT",
      body: serializedBody,
    });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrlWithParams(path, options?.params);
    const serializedBody =
      body !== undefined && typeof body !== "string" && !(body instanceof FormData)
        ? JSON.stringify(body)
        : (body as BodyInit | undefined);

    return executeWithRetry<T>(url, {
      ...options,
      method: "PATCH",
      body: serializedBody,
    });
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = buildUrlWithParams(path, options?.params);
    return executeWithRetry<T>(url, { ...options, method: "DELETE" });
  },

  /**
   * Warm up the backend via health check on application load
   */
  warmBackend(): void {
    if (typeof window === "undefined") return;
    fetch("/api/proxy/health", { method: "GET" }).catch(() => {
      // Ignore background warm-up error
    });
  },
};
