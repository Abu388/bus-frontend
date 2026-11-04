import { useQuery, useMutation } from "@tanstack/react-query";
import { geoApi } from "./api";
import { geoKeys } from "./keys";
import type { LatLng, GeocodePlace, RouteCalculationResult } from "./schemas";

export function useGeoSearch(query: string, enabled = true) {
  const clean = query?.trim() ?? "";
  return useQuery({
    queryKey: geoKeys.search(clean),
    queryFn: () => geoApi.searchPlaces(clean),
    enabled: enabled && clean.length >= 2,
    staleTime: 5 * 60 * 1000,
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
