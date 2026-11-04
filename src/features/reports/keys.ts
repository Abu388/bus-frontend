export const reportKeys = {
  all: ["reports"] as const,
  summaries: () => [...reportKeys.all, "summary"] as const,
  summary: (dateRange?: Record<string, unknown>) =>
    [...reportKeys.summaries(), dateRange ?? {}] as const,
};
