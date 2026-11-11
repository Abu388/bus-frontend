import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { Payment } from "./schemas";

export const paymentsApi = {
  async getPayments(params?: Record<string, string | number | boolean | null | undefined>): Promise<Payment[]> {
    const res = await httpClient.get<ListResponse<Payment>>("/payments/", { params });
    return unwrapList(res);
  },

  async getPayment(id: string): Promise<Payment> {
    return httpClient.get<Payment>(`/payments/${id}/`);
  },

  async getTripPayments(tripId: string): Promise<Payment[]> {
    const res = await httpClient.get<ListResponse<Payment>>(`/trips/${tripId}/payments/`);
    return unwrapList(res);
  },
};
