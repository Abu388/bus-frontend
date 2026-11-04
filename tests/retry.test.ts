import { describe, it, expect } from "vitest";
import { normalizeApiPath, buildUrlWithParams } from "@/shared/api/client";

describe("API client path normalization and URL builder", () => {
  it("ensures trailing slashes on all Django endpoints", () => {
    expect(normalizeApiPath("/buses")).toBe("/api/proxy/buses/");
    expect(normalizeApiPath("/buses/")).toBe("/api/proxy/buses/");
    expect(normalizeApiPath("buses")).toBe("/api/proxy/buses/");
    expect(normalizeApiPath("/api/proxy/buses")).toBe("/api/proxy/buses/");
    expect(normalizeApiPath("/api/proxy/buses/123/maintenance")).toBe(
      "/api/proxy/buses/123/maintenance/"
    );
  });

  it("handles empty path for root fares endpoint /api/", () => {
    expect(normalizeApiPath("")).toBe("/api/proxy/");
    expect(normalizeApiPath("/")).toBe("/api/proxy/");
  });

  it("preserves geo and auth paths without forced trailing slashes", () => {
    expect(normalizeApiPath("/api/geo/search")).toBe("/api/geo/search");
    expect(normalizeApiPath("/api/auth/login")).toBe("/api/auth/login");
  });

  it("correctly appends query parameters", () => {
    const url = buildUrlWithParams("/buses", { status: "active", page: 1, empty: "" });
    expect(url).toBe("/api/proxy/buses/?status=active&page=1");
  });
});
