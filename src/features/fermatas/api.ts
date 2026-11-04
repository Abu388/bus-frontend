import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { Fermata, CreateFermataFormData, UpdateFermataFormData } from "./schemas";

export const fermatasApi = {
  async getFermatas(): Promise<Fermata[]> {
    const res = await httpClient.get<ListResponse<Fermata>>("/fermatas/");
    return unwrapList(res);
  },

  async getFermata(id: string): Promise<Fermata> {
    return httpClient.get<Fermata>(`/fermatas/${id}/`);
  },

  async createFermata(data: CreateFermataFormData): Promise<Fermata> {
    return httpClient.post<Fermata>("/fermatas/", data);
  },

  async updateFermata(id: string, data: UpdateFermataFormData): Promise<Fermata> {
    return httpClient.patch<Fermata>(`/fermatas/${id}/`, data);
  },

  async deleteFermata(id: string): Promise<void> {
    return httpClient.delete<void>(`/fermatas/${id}/`);
  },
};
