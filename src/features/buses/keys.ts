export const busKeys = {
  all: ["buses"] as const,
  lists: () => [...busKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...busKeys.lists(), filters ?? {}] as const,
  details: () => [...busKeys.all, "detail"] as const,
  detail: (id: string) => [...busKeys.details(), id] as const,
  maintenances: () => [...busKeys.all, "maintenance"] as const,
  maintenanceList: (busId?: string) =>
    [...busKeys.maintenances(), busId ? { busId } : "all"] as const,
  trips: (busId: string) => [...busKeys.detail(busId), "trips"] as const,
};
