import { z } from "zod";
import type { components } from "@/types/api";
import { parsePassengerCount } from "@/shared/lib/format";

export type ApiTicket = components["schemas"]["Ticket"];

/**
 * Ticket model enriched with optional multi-passenger fields:
 * passenger_count (default 1), quantity, and unit_fare.
 */
export interface Ticket extends Omit<ApiTicket, "public_bus_number"> {
  public_bus_number?: number | string | null;
  passenger_count?: number;
  quantity?: number;
  unit_fare?: string | number;
  [key: string]: unknown;
}

export interface TicketSummary {
  id?: string;
  code?: string;
  status?: string;
  issued_at?: string;
  expires_at?: string;
  amount?: string | number;
  route_name?: string | null;
  public_bus_number?: number | string | null;
  passenger_count?: number;
  quantity?: number;
  unit_fare?: string | number;
  [key: string]: unknown;
}

export const TicketValidateInputSchema = z.object({
  token: z.string().min(1, "Ticket token or code is required"),
});

export type TicketValidateInput = z.infer<typeof TicketValidateInputSchema>;

export interface TicketValidateResponse {
  ticket_id: string | null;
  valid?: boolean;
  passenger_count?: number;
  quantity?: number;
  unit_fare?: string | number;
  amount?: string | number;
  status?: string;
  [key: string]: unknown;
}

/**
 * Get passenger count for a ticket, falling back to quantity and defaulting to 1.
 */
export function getTicketPassengerCount(ticket?: Partial<Ticket | TicketSummary> | null): number {
  if (!ticket) return 1;
  const count = ticket.passenger_count ?? ticket.quantity;
  return parsePassengerCount(count);
}
