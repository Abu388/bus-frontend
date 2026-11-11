import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { CasherUser, CreateCasherFormData } from "./schemas";

export interface RegisterUserResponse {
  message?: string;
  user?: CasherUser;
  id?: string;
  username?: string;
  email?: string;
  phone?: string;
  full_name?: string;
  role?: string;
}

export const usersApi = {
  async getCashers(): Promise<CasherUser[]> {
    // Upstream URL in Django backend is /api/users/cashers/
    // Normalized by httpClient to /api/proxy/users/cashers
    const res = await httpClient.get<ListResponse<CasherUser> | CasherUser[]>("/users/cashers/");
    return unwrapList(res);
  },

  async createCasher(data: CreateCasherFormData): Promise<CasherUser> {
    // Upstream URL in Django backend is /api/register/
    // Proxy forwards to /api/register/ using existing admin cookies without overwriting session
    const payload = {
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      role: data.role || "casher",
    };

    const res = await httpClient.post<RegisterUserResponse>("/register/", payload);

    if (res?.user && res.user.id) {
      return res.user;
    }

    if (res?.id && res.username) {
      return {
        id: res.id,
        username: res.username,
        email: res.email || payload.email,
        phone: res.phone || payload.phone,
        full_name: res.full_name || payload.full_name,
        role: res.role || payload.role,
      };
    }

    // Defensive fallback: if backend returned minimal response, fetch newly created casher from list
    const cashers = await this.getCashers();
    const created = cashers.find(
      (c) =>
        c.username.toLowerCase() === payload.username.toLowerCase() ||
        c.email.toLowerCase() === payload.email.toLowerCase()
    );

    if (created) {
      return created;
    }

    return {
      id: "new",
      username: payload.username,
      email: payload.email,
      phone: payload.phone,
      full_name: payload.full_name,
      role: payload.role,
    };
  },
};
