export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...ticketKeys.lists(), filters ?? {}] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  code: (id: string) => [...ticketKeys.detail(id), "code"] as const,
};
