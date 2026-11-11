import type { Route } from "@/features/routes/schemas";
import type { BusLiveState } from "./schemas";

export const ROUTE_PALETTE = [
  "#C02626", // Anbessa Crimson
  "#D97706", // Lion Gold / Amber
  "#2563EB", // Royal Blue
  "#059669", // Emerald Green
  "#7C3AED", // Vivid Purple
  "#0891B2", // Cyan / Teal
  "#DC2626", // Red
  "#EA580C", // Orange
  "#4F46E5", // Indigo
  "#0D9488", // Deep Teal
  "#DB2777", // Rose
  "#65A30D", // Lime
] as const;

export function getRouteColor(index: number): string {
  return ROUTE_PALETTE[Math.abs(index) % ROUTE_PALETTE.length];
}

/**
 * Returns the badge label for live bus map markers:
 * Prioritizes the Public Bus Number (e.g. "124", "81"), falling back to targa or "BUS".
 */
export function formatBusBadgeLabel(bus: {
  public_bus_number?: number | string | null;
  targa?: string | null;
}): string {
  if (
    bus.public_bus_number !== null &&
    bus.public_bus_number !== undefined &&
    String(bus.public_bus_number).trim() !== ""
  ) {
    return String(bus.public_bus_number);
  }
  return bus.targa || "BUS";
}

/**
 * Extracts line coordinates for a route.
 * Checks:
 * 1. `route.path_coordinates` directly
 * 2. `route.directions[0].geometry`
 * 3. Fermata stops ordered by sequence_number
 */
export function extractRouteCoordinates(
  route: Route,
  fermataMap?: Map<string, { latitude: number; longitude: number }>
): [number, number][] {
  // 1. Direct path_coordinates
  if (Array.isArray(route.path_coordinates) && route.path_coordinates.length > 1) {
    return route.path_coordinates;
  }

  // 2. Direct fermatas array on route object (if returned by GET /api/routes/<id>/ or /api/routes/)
  const directFermatas = (route as unknown as { fermatas?: Array<{ latitude?: number; longitude?: number }> }).fermatas;
  if (Array.isArray(directFermatas) && directFermatas.length > 1) {
    const coords: [number, number][] = [];
    directFermatas.forEach((f) => {
      if (typeof f?.latitude === "number" && typeof f?.longitude === "number") {
        coords.push([f.latitude, f.longitude]);
      }
    });
    if (coords.length > 1) {
      return coords;
    }
  }

  // 3. Directions geometry (array of coordinates or GeoJSON LineString coordinates)
  if (route.directions && Array.isArray(route.directions)) {
    for (const dir of route.directions) {
      const geom = dir?.geometry as unknown as [number, number][] | { coordinates?: [number, number][] } | undefined;
      if (geom) {
        if (Array.isArray(geom) && geom.length > 1) {
          return geom;
        }
        if (typeof geom === "object" && "coordinates" in geom && Array.isArray(geom.coordinates) && geom.coordinates.length > 1) {
          return geom.coordinates;
        }
      }
    }
  }

  // 4. Fallback: ordered stops through fermatas
  if (route.stops && Array.isArray(route.stops) && route.stops.length > 1) {
    const sortedStops = [...route.stops].sort(
      (a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0)
    );
    const coords: [number, number][] = [];
    sortedStops.forEach((stop) => {
      const f =
        stop.fermata_detail ||
        (stop.fermata && fermataMap ? fermataMap.get(stop.fermata) : null);
      if (f && typeof f.latitude === "number" && typeof f.longitude === "number") {
        coords.push([f.latitude, f.longitude]);
      }
    });
    if (coords.length > 1) {
      return coords;
    }
  }

  return [];
}

export interface LiveBusEnrichedInfo {
  busId: string;
  routeId: string | null;
  publicBusNumber: number | string | null;
  targa: string;
  routeName: string | null;
  displayText: string;
  routeLabel: string;
}

/**
 * Formats live bus display information into:
 * `Bus <public_bus_number> • <targa> • <route_name>`
 */
export function formatLiveBusDisplay(
  bus: BusLiveState,
  options?: {
    routes?: Route[];
    busLookup?: Map<string, { targa: string; routeId?: string | null; status?: string }>;
    routeLookup?: Map<string, { publicNumber: number; name: string }>;
  }
): LiveBusEnrichedInfo {
  const fallbackInfo = options?.busLookup?.get(bus.bus);
  const routeId = bus.route || fallbackInfo?.routeId || null;

  const matchedRoute = routeId
    ? options?.routes?.find((r) => r.id === routeId)
    : undefined;

  const fallbackRoute = routeId && options?.routeLookup
    ? options.routeLookup.get(routeId)
    : undefined;

  const publicBusNumber =
    bus.public_bus_number ??
    matchedRoute?.public_bus_number ??
    fallbackRoute?.publicNumber ??
    null;

  const targa = bus.targa ?? fallbackInfo?.targa ?? "BUS";

  const routeName =
    bus.route_name ??
    matchedRoute?.name ??
    fallbackRoute?.name ??
    null;

  const parts: string[] = [];
  if (publicBusNumber !== null && publicBusNumber !== undefined) {
    parts.push(`Bus ${publicBusNumber}`);
  }
  parts.push(targa);
  if (routeName) {
    parts.push(routeName);
  }

  const displayText = parts.join(" • ");
  const routeLabel = publicBusNumber
    ? `Line ${publicBusNumber}`
    : routeName ?? "Unassigned Route";

  return {
    busId: bus.bus,
    routeId,
    publicBusNumber,
    targa,
    routeName,
    displayText,
    routeLabel,
  };
}
