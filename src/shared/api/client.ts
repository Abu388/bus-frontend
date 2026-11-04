import { AppError, normalizeError } from "./errors";
import { serverWakingStore } from "./waking-store";
import type { RequestOptions } from "./types";

let requestCounter = 0;

/**
 * Normalizes an API path ensuring proper prefixing and mandatory trailing slashes.
 * e.g., "/buses" -> "/api/proxy/buses/"
 *       "/api/proxy/buses" -> "/api/proxy/buses/"
 *       "buses" -> "/api/proxy/buses/"
 *       "/api/geo/search" -> "/api/geo/search" (geo endpoints do not use trailing slashes)
 */
export function normalizeApiPath(path: string): string {
  // If already absolute URL or geo/auth path
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Geo and Auth routes
  if (path.startsWith("/api/geo") || path.startsWith("/api/auth")) {
    return path;
  }

  let clean = path;
  if (clean.startsWith("/api/proxy")) {
    clean = clean.replace(/^\/api\/proxy\/?/, "");
  } else if (clean.startsWith("/")) {
    clean = clean.slice(1);
  }

  // Preserve trailing slash for Django endpoints
  if (clean === "") {
    return "/api/proxy/";
  }

  const slashClean = clean.endsWith("/") ? clean : `${clean}/`;
  return `/api/proxy/${slashClean}`;
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

    // If 204 No Content
    if (response.status === 204) {
      return {} as T;
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
    fetch("/api/proxy/health/", { method: "GET" }).catch(() => {
      // Ignore background warm-up error
    });
  },
};
