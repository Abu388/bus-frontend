import { useQuery } from "@tanstack/react-query";
import { trackingApi } from "./api";
import { trackingKeys } from "./keys";

export function useLiveBuses(options?: { enabled?: boolean; pollIntervalMs?: number }) {
  const { enabled = true, pollIntervalMs = 5000 } = options ?? {};

  return useQuery({
    queryKey: trackingKeys.live(),
    queryFn: () => trackingApi.getLiveBuses(),
    enabled,
    refetchInterval: pollIntervalMs,
    refetchIntervalInBackground: false, // Pauses polling when the browser tab is hidden
    staleTime: 3000,
  });
}

export function useBusSearch(query: string, enabled = true) {
  const clean = query?.trim() ?? "";
  return useQuery({
    queryKey: trackingKeys.search(clean),
    queryFn: () => trackingApi.searchBuses(clean),
    enabled: enabled && clean.length > 0,
    staleTime: 5000,
  });
}

export function useBusLocation(busId?: string) {
  return useQuery({
    queryKey: busId ? trackingKeys.location(busId) : ["tracking", "location", "none"],
    queryFn: () => (busId ? trackingApi.getBusLocation(busId) : null),
    enabled: Boolean(busId),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}

export function useBusETA(busId?: string) {
  return useQuery({
    queryKey: busId ? trackingKeys.eta(busId) : ["tracking", "eta", "none"],
    queryFn: () => (busId ? trackingApi.getBusETA(busId) : null),
    enabled: Boolean(busId),
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });
}
