import { z } from "zod";
import type { components } from "@/types/api";
import { parsePassengerCount } from "@/shared/lib/format";

export interface AuditLogMetadata {
  passenger_count?: number;
  quantity?: number;
  unit_fare?: string | number;
  amount?: string | number;
  payment_id?: string;
  ticket_id?: string;
  trip_id?: string;
  route_id?: string;
  bus_id?: string;
  token?: string;
  code?: string;
  [key: string]: unknown;
}

export type ApiActionEnum = components["schemas"]["ActionEnum"];
export type ActionEnum =
  | ApiActionEnum
  | "payment.initiated"
  | "payment.succeeded"
  | "payment.failed"
  | "ticket.issued"
  | "ticket.validated";
export type ActorKindEnum = components["schemas"]["ActorKindEnum"];

export interface AuditLog extends Omit<components["schemas"]["AuditLog"], "metadata" | "action"> {
  action: ActionEnum | string;
  metadata?: AuditLogMetadata | Record<string, unknown> | null;
}

export const AuditFiltersSchema = z.object({
  actor: z.string().optional(),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().optional(),
});

export type AuditFilters = z.infer<typeof AuditFiltersSchema>;

/**
 * Get passenger count from audit log metadata, defaulting to 1 when undefined.
 */
export function getAuditPassengerCount(
  metadata?: AuditLogMetadata | Record<string, unknown> | null
): number {
  if (!metadata) return 1;
  const raw =
    (metadata as AuditLogMetadata).passenger_count ??
    (metadata as AuditLogMetadata).quantity;
  return parsePassengerCount(raw);
}
