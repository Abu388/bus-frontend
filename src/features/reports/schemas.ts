import { z } from "zod";

export interface ReportTotals {
  trips_count: number;
  passengers_count: number;
  revenue: string;
}

export interface RouteRevenueBreakdown {
  route_id: string;
  public_bus_number: number;
  route_name: string;
  passengers: number;
  revenue: string;
}

export interface DayRevenueBreakdown {
  date: string;
  passengers: number;
  revenue: string;
}

export interface BusRevenueBreakdown {
  bus_id: string;
  targa: string;
  passengers: number;
  revenue: string;
}

export interface ReportsSummaryResponse {
  totals: ReportTotals;
  by_route: RouteRevenueBreakdown[];
  by_day: DayRevenueBreakdown[];
  by_bus: BusRevenueBreakdown[];
}

export const ReportDateRangeSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type ReportDateRange = z.infer<typeof ReportDateRangeSchema>;
