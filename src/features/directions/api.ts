import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { RouteDirection, CreateDirectionFormData, UpdateDirectionFormData } from "./schemas";

export const directionsApi = {
  async getDirections(params?: { route?: string }): Promise<RouteDirection[]> {
    const res = await httpClient.get<ListResponse<RouteDirection>>("/directions/", { params });
    return unwrapList(res);
  },

  async getDirection(id: string): Promise<RouteDirection> {
    return httpClient.get<RouteDirection>(`/directions/${id}/`);
  },

  async createDirection(data: CreateDirectionFormData): Promise<RouteDirection> {
    return httpClient.post<RouteDirection>("/directions/", data);
  },

  async updateDirection(id: string, data: UpdateDirectionFormData): Promise<RouteDirection> {
    return httpClient.patch<RouteDirection>(`/directions/${id}/`, data);
  },

  async deleteDirection(id: string): Promise<void> {
    return httpClient.delete<void>(`/directions/${id}/`);
  },
};
