import { z } from "zod";
import type { components } from "@/types/api";

export type Route = components["schemas"]["Route"];
export type RouteDirection = components["schemas"]["RouteDirection"];
export type RouteStop = components["schemas"]["RouteStop"];

export const CreateRouteSchema = z.object({
  public_bus_number: z.coerce.number().int().positive("Bus number must be positive"),
  name: z.string().trim().min(3, "Route name is required"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type CreateRouteFormData = z.infer<typeof CreateRouteSchema>;

export const UpdateRouteSchema = z.object({
  public_bus_number: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(3).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type UpdateRouteFormData = z.infer<typeof UpdateRouteSchema>;

export const StopOrderingItemSchema = z.object({
  fermata: z.string().uuid(),
  sequence_number: z.number().int().positive(),
});

export type StopOrderingItem = z.infer<typeof StopOrderingItemSchema>;
