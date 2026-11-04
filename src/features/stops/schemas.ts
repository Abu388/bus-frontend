import { z } from "zod";
import type { components } from "@/types/api";

export type RouteStop = components["schemas"]["RouteStop"];

export const CreateRouteStopSchema = z.object({
  route: z.string().uuid("Invalid route UUID"),
  fermata: z.string().uuid("Invalid fermata UUID"),
  sequence_number: z.coerce.number().int().positive(),
});

export type CreateRouteStopFormData = z.infer<typeof CreateRouteStopSchema>;

export const UpdateRouteStopSchema = z.object({
  sequence_number: z.coerce.number().int().positive().optional(),
});

export type UpdateRouteStopFormData = z.infer<typeof UpdateRouteStopSchema>;
