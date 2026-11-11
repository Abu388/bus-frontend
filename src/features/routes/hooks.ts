import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routesApi } from "./api";
import { routeKeys } from "./keys";
import type { Route, CreateRouteFormData, UpdateRouteFormData } from "./schemas";
import type { BuildRoutePayload } from "./builder/schemas";
import { fermataKeys } from "@/features/fermatas/keys";
import { stopKeys } from "@/features/stops/keys";
import { directionKeys } from "@/features/directions/keys";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

function invalidateRouteGraph(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: routeKeys.all });
  queryClient.invalidateQueries({ queryKey: fermataKeys.all });
  queryClient.invalidateQueries({ queryKey: stopKeys.all });
  queryClient.invalidateQueries({ queryKey: directionKeys.all });
}

export function useRoutes() {
  return useQuery({
    queryKey: routeKeys.lists(),
    queryFn: () => routesApi.getRoutes(),
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: () => routesApi.getRoute(id),
    enabled: Boolean(id),
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Route, AppError, CreateRouteFormData>({
    mutationFn: (data) => routesApi.createRoute(data),
    onSuccess: (newRoute) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast({
        title: "Route Created",
        description: `Route #${newRoute.public_bus_number} (${newRoute.name}) created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create route",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Route, AppError, { id: string; data: UpdateRouteFormData }>({
    mutationFn: ({ id, data }) => routesApi.updateRoute(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      if (updated.id) {
        queryClient.invalidateQueries({ queryKey: routeKeys.detail(updated.id) });
      }
      toast({
        title: "Route Updated",
        description: `Route #${updated.public_bus_number} was updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update route",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, string>({
    mutationFn: (id: string) => routesApi.deleteRoute(id),
    onSuccess: () => {
      invalidateRouteGraph(queryClient);
    },
    // Errors are surfaced inline inside the delete confirmation dialog.
  });
}

export function useBuildRoute() {
  const queryClient = useQueryClient();

  return useMutation<Route, AppError, BuildRoutePayload>({
    mutationFn: (payload) => routesApi.buildRoute(payload),
    onSuccess: () => invalidateRouteGraph(queryClient),
  });
}

export function useUpdateBuiltRoute() {
  const queryClient = useQueryClient();

  return useMutation<Route, AppError, { id: string; payload: BuildRoutePayload }>({
    mutationFn: ({ id, payload }) => routesApi.updateBuiltRoute(id, payload),
    onSuccess: () => invalidateRouteGraph(queryClient),
  });
}
