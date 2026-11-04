export const directionKeys = {
  all: ["directions"] as const,
  lists: () => [...directionKeys.all, "list"] as const,
  list: (routeId?: string) => [...directionKeys.lists(), routeId ? { routeId } : "all"] as const,
  details: () => [...directionKeys.all, "detail"] as const,
  detail: (id: string) => [...directionKeys.details(), id] as const,
};
