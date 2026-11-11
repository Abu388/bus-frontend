import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stopsApi } from "./api";
import { stopKeys } from "./keys";
import { routeKeys } from "@/features/routes/keys";
import { fermataKeys } from "@/features/fermatas/keys";
import { directionKeys } from "@/features/directions/keys";
import type { RouteStop, CreateRouteStopFormData, UpdateRouteStopFormData } from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

export function useStops(routeId?: string) {
  return useQuery({
    queryKey: stopKeys.list(routeId),
    queryFn: () => stopsApi.getStops(routeId ? { route: routeId } : undefined),
    enabled: routeId !== undefined ? Boolean(routeId) : true,
  });
}

export function useCreateStop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<RouteStop, AppError, CreateRouteStopFormData>({
    mutationFn: (data) => stopsApi.createStop(data),
    onSuccess: (newStop) => {
      queryClient.invalidateQueries({ queryKey: stopKeys.lists() });
      if (newStop.route) {
        queryClient.invalidateQueries({ queryKey: routeKeys.detail(newStop.route) });
      }
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast({
        title: "Stop Added",
        description: "Fermata added to route successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add stop",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateStop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<RouteStop, AppError, { id: string; routeId?: string; data: UpdateRouteStopFormData }>({
    mutationFn: ({ id, data }) => stopsApi.updateStop(id, data),
    onSuccess: (updated, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: stopKeys.lists() });
      if (routeId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.detail(routeId) });
      }
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
    },
    onError: (error) => {
      toast({
        title: "Failed to update stop sequence",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteStop() {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, { id: string; routeId?: string }>({
    mutationFn: ({ id }) => stopsApi.deleteStop(id),
    onSuccess: (_, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: stopKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: fermataKeys.all });
      queryClient.invalidateQueries({ queryKey: directionKeys.all });
      if (routeId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.detail(routeId) });
      }
    },
    // Errors are surfaced inline inside the delete confirmation dialog.
  });
}
