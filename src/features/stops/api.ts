import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { RouteStop, CreateRouteStopFormData, UpdateRouteStopFormData } from "./schemas";

export const stopsApi = {
  async getStops(params?: { route?: string }): Promise<RouteStop[]> {
    const res = await httpClient.get<ListResponse<RouteStop>>("/stops/", { params });
    return unwrapList(res);
  },

  async getStop(id: string): Promise<RouteStop> {
    return httpClient.get<RouteStop>(`/stops/${id}/`);
  },

  async createStop(data: CreateRouteStopFormData): Promise<RouteStop> {
    return httpClient.post<RouteStop>("/stops/", data);
  },

  async updateStop(id: string, data: UpdateRouteStopFormData): Promise<RouteStop> {
    return httpClient.patch<RouteStop>(`/stops/${id}/`, data);
  },

  async deleteStop(id: string): Promise<void> {
    return httpClient.delete<void>(`/stops/${id}/`);
  },
};
