import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { Fare, FareHistory, CreateFareFormData } from "./schemas";

export const faresApi = {
  /**
   * Note: Mounted at Django root /api/
   */
  async getFares(params?: { active?: boolean; route?: string }): Promise<Fare[]> {
    const res = await httpClient.get<ListResponse<Fare>>("/api/proxy/", { params });
    return unwrapList(res);
  },

  async createFare(data: CreateFareFormData): Promise<Fare> {
    return httpClient.post<Fare>("/api/proxy/", {
      route: data.route,
      amount: String(data.amount),
    });
  },

  async getFareHistory(params?: { route?: string }): Promise<FareHistory[]> {
    const res = await httpClient.get<ListResponse<FareHistory>>("/admin/fares/history/", { params });
    return unwrapList(res);
  },
};
