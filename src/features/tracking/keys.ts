export const trackingKeys = {
  all: ["tracking"] as const,
  live: () => [...trackingKeys.all, "live"] as const,
  search: (query: string) => [...trackingKeys.all, "search", query.toLowerCase()] as const,
  location: (busId: string) => [...trackingKeys.all, "location", busId] as const,
  eta: (busId: string) => [...trackingKeys.all, "eta", busId] as const,
};
