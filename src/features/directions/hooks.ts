import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directionsApi } from "./api";
import { directionKeys } from "./keys";
import { routeKeys } from "@/features/routes/keys";
import type { RouteDirection, CreateDirectionFormData, UpdateDirectionFormData } from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

export function useDirections(routeId?: string) {
  return useQuery({
    queryKey: directionKeys.list(routeId),
    queryFn: () => directionsApi.getDirections(routeId ? { route: routeId } : undefined),
    enabled: routeId !== undefined ? Boolean(routeId) : true,
  });
}

export function useUpdateDirection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<RouteDirection, AppError, { id: string; routeId?: string; data: UpdateDirectionFormData }>({
    mutationFn: ({ id, data }) => directionsApi.updateDirection(id, data),
    onSuccess: (updated, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: directionKeys.lists() });
      if (routeId) {
        queryClient.invalidateQueries({ queryKey: routeKeys.detail(routeId) });
      }
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast({
        title: "Direction Geometry Saved",
        description: "Route direction geometry updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update direction",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
