import { httpClient } from "@/shared/api/client";
import type {
  GeocodePlace,
  LatLng,
  NearestRoadResult,
  RouteCalculationResult,
} from "./schemas";

export const geoApi = {
  searchPlaces(
    query: string,
    limit = 8,
    options?: { viewbox?: string; bounded?: boolean }
  ): Promise<GeocodePlace[]> {
    if (!query || query.trim().length < 2) {
      return Promise.resolve([]);
    }
    return httpClient.get<GeocodePlace[]>("/api/geo/search", {
      params: {
        q: query.trim(),
        limit,
        viewbox: options?.viewbox,
        bounded: options?.bounded ? 1 : undefined,
      },
    });
  },

  reverseGeocode(lat: number, lon: number): Promise<GeocodePlace> {
    return httpClient.get<GeocodePlace>("/api/geo/reverse", {
      params: { lat, lon },
    });
  },

  snapToNearestRoad(lat: number, lon: number): Promise<NearestRoadResult> {
    return httpClient.get<NearestRoadResult>("/api/geo/nearest", {
      params: { lat, lon },
    });
  },

  calculateRoute(
    points: LatLng[],
    signal?: AbortSignal
  ): Promise<RouteCalculationResult> {
    return httpClient.post<RouteCalculationResult>(
      "/api/geo/route",
      { points },
      { signal }
    );
  },
};
