export const stopKeys = {
  all: ["stops"] as const,
  lists: () => [...stopKeys.all, "list"] as const,
  list: (routeId?: string) => [...stopKeys.lists(), routeId ? { routeId } : "all"] as const,
  details: () => [...stopKeys.all, "detail"] as const,
  detail: (id: string) => [...stopKeys.details(), id] as const,
};
