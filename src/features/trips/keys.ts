export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  adminLists: () => [...tripKeys.all, "admin-list"] as const,
  adminList: (filters?: Record<string, unknown>) =>
    [...tripKeys.adminLists(), filters ?? {}] as const,
  details: () => [...tripKeys.all, "detail"] as const,
  detail: (id: string) => [...tripKeys.details(), id] as const,
  payments: (id: string) => [...tripKeys.detail(id), "payments"] as const,
};
