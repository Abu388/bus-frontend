import { z } from "zod";
import type { components } from "@/types/api";

export type Fermata = components["schemas"]["Fermata"];

export const CreateFermataSchema = z.object({
  name: z.string().trim().min(2, "Fermata name is required"),
  latitude: z.coerce.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
  longitude: z.coerce.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
});

export type CreateFermataFormData = z.infer<typeof CreateFermataSchema>;

export const UpdateFermataSchema = z.object({
  name: z.string().trim().min(2, "Fermata name is required").optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type UpdateFermataFormData = z.infer<typeof UpdateFermataSchema>;
