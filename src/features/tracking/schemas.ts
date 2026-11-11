import { z } from "zod";
import type { components } from "@/types/api";

export type ApiBusLiveState = components["schemas"]["BusLiveState"];

export interface BusLiveState extends ApiBusLiveState {
  route?: string | null;
  public_bus_number?: number | string | null;
  route_name?: string | null;
  targa?: string | null;
}

export interface BusETAItem {
  fermata_id: string;
  fermata_name: string;
  sequence_number?: number;
  eta_seconds?: number;
  eta_formatted?: string;
  distance_meters?: number;
}

export interface BusETAResponse {
  bus_id: string;
  trip_id?: string;
  etas?: BusETAItem[];
  upcoming_stops?: BusETAItem[];
  [key: string]: unknown;
}

export interface BusLocationResponse {
  bus?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  recorded_at?: string;
  received_at?: string;
  [key: string]: unknown;
}

export const BusSearchQuerySchema = z.object({
  query: z.string().trim().min(1),
});
