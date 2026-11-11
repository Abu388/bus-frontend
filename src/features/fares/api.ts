import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { Fare, FareHistory, CreateFareFormData } from "./schemas";

export const faresApi = {
  /**
   * Note: Mounted at Django root /api/
   */
  async getFares(params?: { active?: boolean; route?: string }): Promise<Fare[]> {
    const res = await httpClient.get<ListResponse<Fare>>("/api/proxy", { params });
    return unwrapList(res);
  },

  async createFare(data: CreateFareFormData): Promise<Fare> {
    // FareSerializer requires effective_from and a decimal amount. Sending the
    // current timestamp closes the previous active fare and opens this one.
    return httpClient.post<Fare>("/api/proxy", {
      route: data.route,
      amount: Number(data.amount).toFixed(2),
      effective_from: new Date().toISOString(),
    });
  },

  async getFareHistory(params?: {
    route?: string;
    page?: number;
    page_size?: number;
  }): Promise<FareHistory[]> {
    const res = await httpClient.get<ListResponse<FareHistory>>(
      "/admin/fares/history/",
      { params: { page_size: 100, ...params } }
    );
    return unwrapList(res);
  },
};
