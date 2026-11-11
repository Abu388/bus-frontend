export const userKeys = {
  all: ["users"] as const,
  cashers: () => [...userKeys.all, "cashers"] as const,
};
