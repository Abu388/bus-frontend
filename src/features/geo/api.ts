import { httpClient } from "@/shared/api/client";
import type { GeocodePlace, LatLng, RouteCalculationResult } from "./schemas";

export const geoApi = {
  searchPlaces(query: string, limit = 6): Promise<GeocodePlace[]> {
    if (!query || query.trim().length < 2) {
      return Promise.resolve([]);
    }
    return httpClient.get<GeocodePlace[]>("/api/geo/search", {
      params: { q: query.trim(), limit },
    });
  },

  reverseGeocode(lat: number, lon: number): Promise<GeocodePlace> {
    return httpClient.get<GeocodePlace>("/api/geo/reverse", {
      params: { lat, lon },
    });
  },

  calculateRoute(points: LatLng[]): Promise<RouteCalculationResult> {
    return httpClient.post<RouteCalculationResult>("/api/geo/route", { points });
  },
};
