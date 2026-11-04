import { z } from "zod";

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export type LatLng = z.infer<typeof LatLngSchema>;

export interface GeocodePlace {
  placeId: number;
  displayName: string;
  lat: number;
  lon: number;
}

export interface RouteCalculationResult {
  coordinates: [number, number][]; // [lat, lon][]
  distanceMeters: number;
  durationSeconds: number;
  isFallback?: boolean;
}
