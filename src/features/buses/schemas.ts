import { z } from "zod";
import type { components } from "@/types/api";

export type PhysicalBus = components["schemas"]["PhysicalBus"];
export type PhysicalBusStatus = components["schemas"]["PhysicalBusStatusEnum"];
export type MaintenanceEvent = components["schemas"]["MaintenanceEvent"];
export type BusTripReport = components["schemas"]["BusTripReport"];

export const CreateBusSchema = z.object({
  targa: z.string().trim().min(3, "Plate number (targa) is required"),
  route: z.string().uuid("Invalid route UUID").optional().nullable().or(z.literal("")),
  status: z.enum(["active", "maintenance", "retired", "inactive"]).default("active"),
});

export type CreateBusFormData = z.infer<typeof CreateBusSchema>;

export const UpdateBusSchema = z.object({
  targa: z.string().trim().min(3, "Plate number (targa) is required").optional(),
  route: z.string().uuid("Invalid route UUID").optional().nullable().or(z.literal("")),
  status: z.enum(["active", "maintenance", "retired", "inactive"]).optional(),
});

export type UpdateBusFormData = z.infer<typeof UpdateBusSchema>;

export const MaintenanceStartSchema = z.object({
  reason: z.string().trim().min(2, "Reason is required"),
  description: z.string().trim().optional(),
});

export type MaintenanceStartFormData = z.infer<typeof MaintenanceStartSchema>;
