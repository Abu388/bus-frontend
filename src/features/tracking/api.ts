import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { BusLiveState, BusETAResponse, BusLocationResponse } from "./schemas";

export const trackingApi = {
  async getLiveBuses(): Promise<BusLiveState[]> {
    const res = await httpClient.get<ListResponse<BusLiveState>>("/buses/live/");
    return unwrapList(res);
  },

  async searchBuses(query: string): Promise<BusLiveState[]> {
    if (!query || !query.trim()) return [];
    const clean = query.trim();
    // Pass both query and number so backend matches regardless of parameter naming
    const res = await httpClient.get<ListResponse<BusLiveState>>("/buses/search/", {
      params: { query: clean, number: clean },
    });
    return unwrapList(res);
  },

  async getBusLocation(busId: string): Promise<BusLocationResponse | null> {
    try {
      return await httpClient.get<BusLocationResponse>(`/buses/${busId}/location/`);
    } catch {
      return null;
    }
  },

  async getBusETA(busId: string): Promise<BusETAResponse | null> {
    try {
      return await httpClient.get<BusETAResponse>(`/buses/${busId}/eta/`);
    } catch {
      return null;
    }
  },
};
