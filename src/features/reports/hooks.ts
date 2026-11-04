import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "./api";
import { reportKeys } from "./keys";
import type { ReportDateRange } from "./schemas";

export function useReportsSummary(dateRange?: ReportDateRange) {
  return useQuery({
    queryKey: reportKeys.summary(dateRange),
    queryFn: () => reportsApi.getSummary(dateRange),
  });
}
