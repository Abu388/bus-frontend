import { useQuery, useMutation } from "@tanstack/react-query";
import { geoApi } from "./api";
import { geoKeys } from "./keys";
import type { LatLng, RouteCalculationResult } from "./schemas";

export function useGeoSearch(query: string, enabled = true) {
  const clean = query?.trim() ?? "";
  return useQuery({
    queryKey: geoKeys.search(clean),
    queryFn: () => geoApi.searchPlaces(clean),
    enabled: enabled && clean.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Bounded Nominatim search for OSM-mapped bus stops inside the current map
 * viewport. Disabled until the caller has a viewbox (and is zoomed in).
 */
export function useOsmBusStops(viewbox?: string, enabled = true) {
  return useQuery({
    queryKey: geoKeys.osmBusStops(viewbox),
    queryFn: () =>
      geoApi.searchPlaces("bus stop", 20, { viewbox, bounded: true }),
    enabled: enabled && Boolean(viewbox),
    staleTime: 10 * 60 * 1000,
  });
}

export function useReverseGeocode(lat?: number, lon?: number, enabled = true) {
  const isValid =
    lat !== undefined &&
    lon !== undefined &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  return useQuery({
    queryKey: isValid ? geoKeys.reverse(lat, lon) : ["geo", "reverse", "invalid"],
    queryFn: () => geoApi.reverseGeocode(lat!, lon!),
    enabled: enabled && isValid,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCalculateRoute() {
  return useMutation<RouteCalculationResult, Error, LatLng[]>({
    mutationFn: (points: LatLng[]) => geoApi.calculateRoute(points),
  });
}
