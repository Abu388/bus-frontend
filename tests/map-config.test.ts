import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMapDefaults, TILE_URL, GEOCODE_URL, ROUTE_URL } from "@/shared/config/map";

describe("Map Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("exports correct defaults for URLs matching deployed OSM host", () => {
    expect(TILE_URL).toContain("/tile/{z}/{x}/{y}.png");
    expect(GEOCODE_URL).toBeTruthy();
    expect(ROUTE_URL).toBeTruthy();
  });

  it("returns Addis Ababa defaults for Anbessa brand", () => {
    const defaults = getMapDefaults("anbessa");
    expect(defaults.center).toEqual([9.0155, 38.7636]);
    expect(defaults.zoom).toBe(13);
  });

  it("honors environment variable overrides for center and zoom", () => {
    process.env.NEXT_PUBLIC_MAP_CENTER_LAT = "9.0300";
    process.env.NEXT_PUBLIC_MAP_CENTER_LNG = "38.7400";
    process.env.NEXT_PUBLIC_MAP_ZOOM = "15";

    const defaults = getMapDefaults("anbessa");
    expect(defaults.center).toEqual([9.03, 38.74]);
    expect(defaults.zoom).toBe(15);
  });
});
