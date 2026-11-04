export const fermataKeys = {
  all: ["fermatas"] as const,
  lists: () => [...fermataKeys.all, "list"] as const,
  details: () => [...fermataKeys.all, "detail"] as const,
  detail: (id: string) => [...fermataKeys.details(), id] as const,
};
