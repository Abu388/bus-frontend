import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { Route, CreateRouteFormData, UpdateRouteFormData } from "./schemas";

export const routesApi = {
  async getRoutes(): Promise<Route[]> {
    const res = await httpClient.get<ListResponse<Route>>("/routes/");
    return unwrapList(res);
  },

  async getRoute(id: string): Promise<Route> {
    return httpClient.get<Route>(`/routes/${id}/`);
  },

  async createRoute(data: CreateRouteFormData): Promise<Route> {
    return httpClient.post<Route>("/routes/", data);
  },

  async updateRoute(id: string, data: UpdateRouteFormData): Promise<Route> {
    return httpClient.patch<Route>(`/routes/${id}/`, data);
  },

  async deleteRoute(id: string): Promise<void> {
    return httpClient.delete<void>(`/routes/${id}/`);
  },
};
