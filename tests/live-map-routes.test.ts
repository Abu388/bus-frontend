import { describe, it, expect } from "vitest";
import {
  extractRouteCoordinates,
  formatLiveBusDisplay,
  formatBusBadgeLabel,
  getRouteColor,
  ROUTE_PALETTE,
} from "@/features/tracking/routes";
import type { Route } from "@/features/routes/schemas";
import type { BusLiveState } from "@/features/tracking/schemas";

describe("Live Map Route Polylines and Bus Formatting", () => {
  it("cycles through distinct Anbessa route palette colors", () => {
    expect(getRouteColor(0)).toBe(ROUTE_PALETTE[0]);
    expect(getRouteColor(1)).toBe(ROUTE_PALETTE[1]);
    expect(getRouteColor(ROUTE_PALETTE.length)).toBe(ROUTE_PALETTE[0]);
  });

  it("extracts route coordinates from path_coordinates when present", () => {
    const route: Route = {
      id: "r-1",
      public_bus_number: 124,
      name: "Piazza to Megenagna",
      status: "active",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
      stops: [],
      directions: [],
      path_coordinates: [
        [9.03, 38.74],
        [9.02, 38.76],
        [9.01, 38.78],
      ],
    };

    const coords = extractRouteCoordinates(route);
    expect(coords).toHaveLength(3);
    expect(coords[0]).toEqual([9.03, 38.74]);
  });

  it("extracts route coordinates from direction geometry fallback", () => {
    const route: Route = {
      id: "r-2",
      public_bus_number: 4,
      name: "Tor Hailoch to Bole",
      status: "active",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
      stops: [],
      directions: [
        {
          id: "d-1",
          route: "r-2",
          direction: "outbound",
          geometry: [
            [9.01, 38.75],
            [9.00, 38.77],
          ],
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        },
      ],
    };

    const coords = extractRouteCoordinates(route);
    expect(coords).toHaveLength(2);
    expect(coords[0]).toEqual([9.01, 38.75]);
  });

  it("extracts route coordinates from ordered stops and fermatas map", () => {
    const fermataMap = new Map([
      ["f-1", { latitude: 9.04, longitude: 38.75 }],
      ["f-2", { latitude: 9.03, longitude: 38.77 }],
    ]);

    const route = {
      id: "r-3",
      public_bus_number: 10,
      name: "Merkato to Stadium",
      status: "active",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
      stops: [
        {
          id: "s-2",
          route: "r-3",
          fermata: "f-2",
          sequence_number: 2,
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
          fermata_detail: {
            id: "f-2",
            name: "Fermata 2",
            latitude: 9.03,
            longitude: 38.77,
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-01T00:00:00Z",
          },
        },
        {
          id: "s-1",
          route: "r-3",
          fermata: "f-1",
          sequence_number: 1,
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
          fermata_detail: {
            id: "f-1",
            name: "Fermata 1",
            latitude: 9.04,
            longitude: 38.75,
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-01T00:00:00Z",
          },
        },
      ],
      directions: [],
    } as unknown as Route;

    const coords = extractRouteCoordinates(route, fermataMap);
    expect(coords).toHaveLength(2);
    expect(coords[0]).toEqual([9.04, 38.75]); // Sequence 1 first
    expect(coords[1]).toEqual([9.03, 38.77]); // Sequence 2 second
  });

  it("formats live bus display text as Bus <public_bus_number> • <targa> • <route_name>", () => {
    const liveBus: BusLiveState = {
      bus: "b-1",
      trip: "t-1",
      latitude: 9.03,
      longitude: 38.75,
      speed: 34,
      heading: 90,
      recorded_at: "2026-11-08T12:00:00Z",
      received_at: "2026-11-08T12:00:01Z",
      distance_along_m: 1200,
      next_fermata: "f-1",
      next_fermata_name: "Piazza",
      age_seconds: 5,
      is_stale: false,
      route: "r-1",
      public_bus_number: 124,
      route_name: "Piazza to Megenagna",
      targa: "3-AA-12401",
    };

    const formatted = formatLiveBusDisplay(liveBus);
    expect(formatted.publicBusNumber).toBe(124);
    expect(formatted.targa).toBe("3-AA-12401");
    expect(formatted.routeName).toBe("Piazza to Megenagna");
    expect(formatted.displayText).toBe("Bus 124 • 3-AA-12401 • Piazza to Megenagna");
  });

  it("formats live bus display text with route lookup fallback if bus only has route ID", () => {
    const liveBus: BusLiveState = {
      bus: "b-2",
      trip: null,
      latitude: 9.01,
      longitude: 38.74,
      speed: 0,
      heading: null,
      recorded_at: "2026-11-08T12:00:00Z",
      received_at: "2026-11-08T12:00:01Z",
      distance_along_m: 0,
      next_fermata: null,
      next_fermata_name: "",
      age_seconds: 10,
      is_stale: false,
      route: "r-2",
    };

    const routes: Route[] = [
      {
        id: "r-2",
        public_bus_number: 4,
        name: "Tor Hailoch to Bole",
        status: "active",
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
        stops: [],
        directions: [],
      },
    ];

    const busLookup = new Map([
      ["b-2", { targa: "3-AA-99881", routeId: "r-2", status: "active" }],
    ]);

    const formatted = formatLiveBusDisplay(liveBus, { routes, busLookup });
    expect(formatted.displayText).toBe("Bus 4 • 3-AA-99881 • Tor Hailoch to Bole");
  });

  it("extracts route coordinates from route.fermatas direct array (GET /api/routes/<id>/)", () => {
    const route = {
      id: "r-detail",
      public_bus_number: 81,
      name: "Ayat to Stadium",
      status: "active",
      fermatas: [
        { id: "f-ayat", name: "Ayat", latitude: 9.03, longitude: 38.85 },
        { id: "f-mgn", name: "Megenagna", latitude: 9.02, longitude: 38.80 },
        { id: "f-std", name: "Stadium", latitude: 9.01, longitude: 38.75 },
      ],
      stops: [],
      directions: [],
    } as unknown as Route;

    const coords = extractRouteCoordinates(route);
    expect(coords).toHaveLength(3);
    expect(coords[0]).toEqual([9.03, 38.85]);
    expect(coords[2]).toEqual([9.01, 38.75]);
  });

  it("prioritizes public bus number (e.g. 124, 81) directly on the map marker badge over targa", () => {
    // Bus with public bus number: badge must show the public bus number
    const badge124 = formatBusBadgeLabel({
      public_bus_number: 124,
      targa: "3-AA-12401",
    });
    expect(badge124).toBe("124");

    const badge81 = formatBusBadgeLabel({
      public_bus_number: "81",
      targa: "3-AA-99881",
    });
    expect(badge81).toBe("81");

    // Bus without public bus number: falls back to targa
    const fallbackTarga = formatBusBadgeLabel({
      public_bus_number: null,
      targa: "3-AA-55555",
    });
    expect(fallbackTarga).toBe("3-AA-55555");

    // Bus with neither: falls back to BUS
    const fallbackDefault = formatBusBadgeLabel({});
    expect(fallbackDefault).toBe("BUS");
  });
});
