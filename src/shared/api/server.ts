import { DEFAULT_API_BASE_URL, API_TIMEOUT_MS } from "@/shared/config/api";

export { API_TIMEOUT_MS };

/**
 * Server-only Django base URL. Trailing slashes are stripped so callers can
 * safely append absolute paths without producing `//api/...`.
 */
export function getApiBaseUrl(): string {
  const configured = process.env.API_BASE_URL?.trim();
  const base = configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, "");
}

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${cleanPath}`;
}
