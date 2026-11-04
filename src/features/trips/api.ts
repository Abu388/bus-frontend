import { httpClient } from "@/shared/api/client";
import { unwrapList, extractPaginationMeta, type ListResponse, type PaginationMeta } from "@/shared/api/types";
import type { Trip, BusTripReport, Payment, TripFilters } from "./schemas";

export interface AdminTripsResult {
  items: BusTripReport[];
  meta: PaginationMeta;
}

export const tripsApi = {
  async getTrips(params?: Record<string, string | number | boolean | undefined | null>): Promise<Trip[]> {
    const res = await httpClient.get<ListResponse<Trip>>("/trips/", { params });
    return unwrapList(res);
  },

  async getAdminTrips(filters?: TripFilters): Promise<AdminTripsResult> {
    const res = await httpClient.get<ListResponse<BusTripReport>>("/admin/trips/", {
      params: filters as Record<string, string | number | boolean | undefined | null>,
    });
    return {
      items: unwrapList(res),
      meta: extractPaginationMeta(res),
    };
  },

  async endTrip(id: string): Promise<Trip> {
    return httpClient.post<Trip>(`/trips/${id}/end/`, {});
  },

  async getTripPayments(tripId: string): Promise<Payment[]> {
    const res = await httpClient.get<ListResponse<Payment>>(`/trips/${tripId}/payments/`);
    return unwrapList(res);
  },
};
