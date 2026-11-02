import type { paths } from "@/types/api";

export type ApiPaths = keyof paths;

/**
 * Type-safe API client that calls Next.js BFF proxy routes or server-side endpoints
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorData.detail || JSON.stringify(errorData);
    } catch {
      errorMessage = res.statusText || `Request failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}
