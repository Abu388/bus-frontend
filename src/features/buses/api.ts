import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type {
  PhysicalBus,
  CreateBusFormData,
  UpdateBusFormData,
  MaintenanceEvent,
  MaintenanceStartFormData,
  BusTripReport,
} from "./schemas";

export const busesApi = {
  async getBuses(params?: { status?: string; search?: string }): Promise<PhysicalBus[]> {
    const res = await httpClient.get<ListResponse<PhysicalBus>>("/buses/", { params });
    return unwrapList(res);
  },

  async getBus(id: string): Promise<PhysicalBus> {
    return httpClient.get<PhysicalBus>(`/buses/${id}/`);
  },

  async createBus(data: CreateBusFormData): Promise<PhysicalBus> {
    const payload = {
      ...data,
      route: data.route ? data.route : null,
    };
    return httpClient.post<PhysicalBus>("/buses/", payload);
  },

  async updateBus(id: string, data: UpdateBusFormData): Promise<PhysicalBus> {
    const payload = {
      ...data,
      ...(data.route !== undefined ? { route: data.route ? data.route : null } : {}),
    };
    return httpClient.patch<PhysicalBus>(`/buses/${id}/`, payload);
  },

  async retireBus(id: string): Promise<PhysicalBus> {
    return httpClient.patch<PhysicalBus>(`/buses/${id}/`, { status: "retired" });
  },

  async deleteBus(id: string): Promise<void> {
    return httpClient.delete<void>(`/buses/${id}/`);
  },

  async getBusMaintenance(busId: string): Promise<MaintenanceEvent[]> {
    const res = await httpClient.get<ListResponse<MaintenanceEvent>>(`/buses/${busId}/maintenance/`);
    return unwrapList(res);
  },

  async sendToMaintenance(
    busId: string,
    data: MaintenanceStartFormData
  ): Promise<MaintenanceEvent> {
    return httpClient.post<MaintenanceEvent>(`/buses/${busId}/maintenance/`, data);
  },

  async resumeBus(busId: string): Promise<MaintenanceEvent> {
    return httpClient.post<MaintenanceEvent>(`/buses/${busId}/resume/`, {});
  },

  async getAllMaintenance(params?: { ended_at__isnull?: boolean | string }): Promise<MaintenanceEvent[]> {
    const res = await httpClient.get<ListResponse<MaintenanceEvent>>("/maintenance/", { params });
    return unwrapList(res);
  },

  async getMaintenanceEvent(id: string): Promise<MaintenanceEvent> {
    return httpClient.get<MaintenanceEvent>(`/maintenance/${id}/`);
  },

  async getBusTrips(busId: string): Promise<BusTripReport[]> {
    const res = await httpClient.get<ListResponse<BusTripReport>>(`/admin/buses/${busId}/trips/`);
    return unwrapList(res);
  },
};
