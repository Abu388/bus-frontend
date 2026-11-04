import { httpClient } from "@/shared/api/client";
import type { LoginFormData, AuthUser } from "./schemas";

export const authApi = {
  async login(credentials: LoginFormData): Promise<{ user: AuthUser }> {
    return httpClient.post<{ user: AuthUser }>("/api/auth/login", credentials);
  },

  async refresh(): Promise<{ ok: boolean }> {
    return httpClient.post<{ ok: boolean }>("/api/auth/refresh");
  },

  async getMe(): Promise<{ user: AuthUser }> {
    return httpClient.get<{ user: AuthUser }>("/api/auth/me");
  },

  async logout(): Promise<{ ok: boolean }> {
    return httpClient.post<{ ok: boolean }>("/api/auth/logout");
  },
};
