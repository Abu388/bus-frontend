export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...auditKeys.lists(), filters ?? {}] as const,
};
