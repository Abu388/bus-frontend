import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi } from "./api";
import { tripKeys } from "./keys";
import type { TripFilters } from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

export function useAdminTrips(filters?: TripFilters) {
  return useQuery({
    queryKey: tripKeys.adminList(filters),
    queryFn: () => tripsApi.getAdminTrips(filters),
  });
}

export function useTripPayments(tripId?: string) {
  return useQuery({
    queryKey: tripId ? tripKeys.payments(tripId) : ["trips", "no-id", "payments"],
    queryFn: () => (tripId ? tripsApi.getTripPayments(tripId) : Promise.resolve([])),
    enabled: Boolean(tripId),
  });
}

export function useEndTrip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<unknown, AppError, string>({
    mutationFn: (tripId: string) => tripsApi.endTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.adminLists() });
      toast({
        title: "Trip Ended",
        description: "The trip has been concluded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to end trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
