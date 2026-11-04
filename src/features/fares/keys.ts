export const fareKeys = {
  all: ["fares"] as const,
  lists: () => [...fareKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...fareKeys.lists(), filters ?? {}] as const,
  histories: () => [...fareKeys.all, "history"] as const,
  history: (filters?: Record<string, unknown>) => [...fareKeys.histories(), filters ?? {}] as const,
};
