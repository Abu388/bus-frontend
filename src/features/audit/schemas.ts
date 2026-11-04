import { z } from "zod";
import type { components } from "@/types/api";

export type AuditLog = components["schemas"]["AuditLog"];
export type ActionEnum = components["schemas"]["ActionEnum"];
export type ActorKindEnum = components["schemas"]["ActorKindEnum"];

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
