import { httpClient } from "@/shared/api/client";
import type { ReportsSummaryResponse, ReportDateRange } from "./schemas";

export const reportsApi = {
  async getSummary(dateRange?: ReportDateRange): Promise<ReportsSummaryResponse> {
    return httpClient.get<ReportsSummaryResponse>("/admin/reports/summary/", {
      params: dateRange as Record<string, string | number | boolean | undefined | null>,
    });
  },
};
