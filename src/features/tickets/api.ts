import { httpClient } from "@/shared/api/client";
import { unwrapList, type ListResponse } from "@/shared/api/types";
import type { Ticket, TicketValidateInput, TicketValidateResponse } from "./schemas";

export const ticketsApi = {
  async getTickets(params?: Record<string, string | number | boolean | null | undefined>): Promise<Ticket[]> {
    const res = await httpClient.get<ListResponse<Ticket>>("/tickets/", { params });
    return unwrapList(res);
  },

  async getTicket(id: string): Promise<Ticket> {
    return httpClient.get<Ticket>(`/tickets/${id}/`);
  },

  async getTicketCode(id: string): Promise<{ code: string; token: string }> {
    return httpClient.get<{ code: string; token: string }>(`/tickets/${id}/code/`);
  },

  async validateTicket(input: TicketValidateInput): Promise<TicketValidateResponse> {
    return httpClient.post<TicketValidateResponse>("/tickets/validate/", input);
  },
};
