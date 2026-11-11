import { describe, it, expect } from "vitest";
import { normalizeApiPath, buildUrlWithParams } from "@/shared/api/client";

describe("API client path normalization and URL builder", () => {
  it("strips trailing slashes from proxy endpoints to prevent Next.js 308 redirects", () => {
    expect(normalizeApiPath("/buses")).toBe("/api/proxy/buses");
    expect(normalizeApiPath("/buses/")).toBe("/api/proxy/buses");
    expect(normalizeApiPath("buses")).toBe("/api/proxy/buses");
    expect(normalizeApiPath("/api/proxy/buses")).toBe("/api/proxy/buses");
    expect(normalizeApiPath("/api/proxy/buses/")).toBe("/api/proxy/buses");
    expect(normalizeApiPath("/api/proxy/buses/123/maintenance")).toBe(
      "/api/proxy/buses/123/maintenance"
    );
    expect(normalizeApiPath("/api/proxy/buses/123/maintenance/")).toBe(
      "/api/proxy/buses/123/maintenance"
    );
  });

  it("handles empty path for root fares endpoint without trailing slashes", () => {
    expect(normalizeApiPath("")).toBe("/api/proxy");
    expect(normalizeApiPath("/")).toBe("/api/proxy");
    expect(normalizeApiPath("/api/proxy")).toBe("/api/proxy");
    expect(normalizeApiPath("/api/proxy/")).toBe("/api/proxy");
  });

  it("preserves geo, auth, and atomic route-build paths without trailing slashes", () => {
    expect(normalizeApiPath("/api/geo/search")).toBe("/api/geo/search");
    expect(normalizeApiPath("/api/auth/login")).toBe("/api/auth/login");
    expect(normalizeApiPath("/api/routes/build")).toBe("/api/routes/build");
    expect(normalizeApiPath("/api/routes/123/build/")).toBe(
      "/api/routes/123/build"
    );
  });

  it("correctly appends query parameters without trailing slash before query", () => {
    const url = buildUrlWithParams("/buses", { status: "active", page: 1, empty: "" });
    expect(url).toBe("/api/proxy/buses?status=active&page=1");
  });
});
