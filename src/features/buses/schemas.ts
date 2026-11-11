import { z } from "zod";
import type { components } from "@/types/api";

export type PhysicalBusStatus = components["schemas"]["PhysicalBusStatusEnum"];
export type MaintenanceEvent = components["schemas"]["MaintenanceEvent"];
export type BusTripReport = components["schemas"]["BusTripReport"];

export const PhysicalBusSchema = z.object({
  id: z.string().uuid(),
  targa: z.string(),
  route: z.string().uuid().nullable().optional(),
  route_number: z.number().int().nullable().optional(),
  route_name: z.string().nullable().optional(),
  casher: z.string().uuid().nullable(),
  casher_name: z.string().nullable().optional(),
  status: z.enum(["active", "maintenance", "retired"]).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PhysicalBus = components["schemas"]["PhysicalBus"] & {
  casher: string | null;
  casher_name?: string | null;
  route_number?: number | null;
  route_name?: string | null;
};

export const CreateBusSchema = z.object({
  targa: z.string().trim().min(3, "Plate number (targa) is required"),
  route: z.string().uuid("Invalid route UUID").optional().nullable().or(z.literal("")),
  casher: z.string().uuid("Invalid casher UUID").optional().nullable().or(z.literal("")),
  status: z.enum(["active", "maintenance", "retired", "inactive"]),
});

export type CreateBusFormData = z.infer<typeof CreateBusSchema>;

export const UpdateBusSchema = z.object({
  targa: z.string().trim().min(3, "Plate number (targa) is required").optional(),
  route: z.string().uuid("Invalid route UUID").optional().nullable().or(z.literal("")),
  casher: z.string().uuid("Invalid casher UUID").optional().nullable().or(z.literal("")),
  status: z.enum(["active", "maintenance", "retired", "inactive"]).optional(),
});

export type UpdateBusFormData = z.infer<typeof UpdateBusSchema>;

export const MaintenanceStartSchema = z.object({
  reason: z.string().trim().min(2, "Reason is required"),
  description: z.string().trim().optional(),
});

export type MaintenanceStartFormData = z.infer<typeof MaintenanceStartSchema>;
