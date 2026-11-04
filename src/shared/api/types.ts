import type { components, paths } from "@/types/api";

export type Schemas = components["schemas"];

export interface PaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export type ListResponse<T> = PaginatedResponse<T> | T[];

export function unwrapList<T>(response: ListResponse<T> | null | undefined): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.results)) return response.results;
  return [];
}

export interface PaginationMeta {
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextUrl: string | null;
  prevUrl: string | null;
}

export function extractPaginationMeta<T>(response: ListResponse<T> | null | undefined): PaginationMeta {
  if (!response || Array.isArray(response)) {
    const len = Array.isArray(response) ? response.length : 0;
    return {
      total: len,
      hasNext: false,
      hasPrev: false,
      nextUrl: null,
      prevUrl: null,
    };
  }
  return {
    total: typeof response.count === "number" ? response.count : (response.results?.length ?? 0),
    hasNext: Boolean(response.next),
    hasPrev: Boolean(response.previous),
    nextUrl: response.next ?? null,
    prevUrl: response.previous ?? null,
  };
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
}
