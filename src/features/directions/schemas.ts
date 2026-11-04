import { z } from "zod";
import type { components } from "@/types/api";

export type RouteDirection = components["schemas"]["RouteDirection"];
export type DirectionEnum = components["schemas"]["DirectionEnum"];

export const CreateDirectionSchema = z.object({
  route: z.string().uuid("Invalid route UUID"),
  direction: z.enum(["inbound", "outbound"]),
  geometry: z.array(z.array(z.number())).optional(),
  distance_m: z.number().nullable().optional(),
  duration_s: z.number().nullable().optional(),
});

export type CreateDirectionFormData = z.infer<typeof CreateDirectionSchema>;

export const UpdateDirectionSchema = z.object({
  geometry: z.array(z.array(z.number())).optional(),
  distance_m: z.number().nullable().optional(),
  duration_s: z.number().nullable().optional(),
});

export type UpdateDirectionFormData = z.infer<typeof UpdateDirectionSchema>;
