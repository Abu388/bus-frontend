import { z } from "zod";

export const BuildCoordinateSchema = z.tuple([z.number(), z.number()]);

export const BuildDirectionSchema = z.object({
  geometry: z.array(BuildCoordinateSchema).min(2),
  distance_m: z.number().nonnegative().nullable().optional(),
  duration_s: z.number().nonnegative().nullable().optional(),
});

export const BuildStopSchema = z.union([
  z.object({
    fermata_id: z.string().uuid(),
  }),
  z.object({
    new: z.object({
      name: z.string().trim().min(1).max(100),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
  }),
]);

export const BuildRoutePayloadSchema = z.object({
  public_bus_number: z.number().int().positive(),
  name: z.string().trim().min(3).max(100),
  status: z.enum(["active", "inactive"]).default("active"),
  stops: z.array(BuildStopSchema).min(2).max(50),
  directions: z.object({
    outbound: BuildDirectionSchema,
    inbound: BuildDirectionSchema,
  }),
});

export type BuildCoordinate = z.infer<typeof BuildCoordinateSchema>;
export type BuildDirectionInput = z.infer<typeof BuildDirectionSchema>;
export type BuildStopInput = z.infer<typeof BuildStopSchema>;
export type BuildRoutePayload = z.infer<typeof BuildRoutePayloadSchema>;
