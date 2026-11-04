export const routeKeys = {
  all: ["routes"] as const,
  lists: () => [...routeKeys.all, "list"] as const,
  details: () => [...routeKeys.all, "detail"] as const,
  detail: (id: string) => [...routeKeys.details(), id] as const,
};
