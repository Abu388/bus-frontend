import type { components } from "@/types/api";
import { parsePassengerCount } from "@/shared/lib/format";

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

export type ApiPayment = components["schemas"]["Payment"];

/**
 * Payment model enriched by PaymentSerializer.
 * Supports route_name, public_bus_number, ticket { code } / ticket_id,
 * passenger_count (multi-passenger/family count, default 1), quantity, and unit_fare.
 */
export interface Payment extends Omit<ApiPayment, "status" | "ticket_id"> {
  status: components["schemas"]["PaymentStatusEnum"] | string;
  route_name?: string | null;
  public_bus_number?: number | string | null;
  ticket?: TicketSummary | null;
  ticket_id?: string | null;
  passenger_count?: number;
  quantity?: number;
  unit_fare?: string | number;
  [key: string]: unknown;
}

/**
 * Get passenger count for a payment, falling back to quantity or ticket and defaulting to 1.
 */
export function getPaymentPassengerCount(payment?: Partial<Payment> | null): number {
  if (!payment) return 1;
  const count =
    payment.passenger_count ??
    payment.quantity ??
    payment.ticket?.passenger_count ??
    payment.ticket?.quantity;
  return parsePassengerCount(count);
}
