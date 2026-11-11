import { z } from "zod";
import type { components } from "@/types/api";

export type Trip = components["schemas"]["Trip"];
export type BusTripReport = components["schemas"]["BusTripReport"];
export type { Payment, TicketSummary } from "@/features/payments";

export const TripFiltersSchema = z.object({
  bus: z.string().optional(),
  route: z.string().optional(),
  status: z.enum(["active", "ended"]).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().optional(),
});

export type TripFilters = z.infer<typeof TripFiltersSchema>;
