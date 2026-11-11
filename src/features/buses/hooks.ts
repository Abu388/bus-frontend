import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { busesApi } from "./api";
import { busKeys } from "./keys";
import type {
  PhysicalBus,
  CreateBusFormData,
  UpdateBusFormData,
  MaintenanceStartFormData,
} from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

export function useBuses(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: busKeys.list(filters),
    queryFn: () => busesApi.getBuses(filters),
  });
}

export function useBus(id: string) {
  return useQuery({
    queryKey: busKeys.detail(id),
    queryFn: () => busesApi.getBus(id),
    enabled: Boolean(id),
  });
}

export function invalidateFleetRelatedQueries(
  queryClient: { invalidateQueries: (options: { queryKey: readonly unknown[] }) => unknown },
  busId?: string
) {
  queryClient.invalidateQueries({ queryKey: busKeys.lists() });
  if (busId) {
    queryClient.invalidateQueries({ queryKey: busKeys.detail(busId) });
    queryClient.invalidateQueries({ queryKey: busKeys.maintenanceList(busId) });
  }
  queryClient.invalidateQueries({ queryKey: busKeys.maintenances() });
  // Requirement 2: Auto-invalidate trips, live-buses, tracking, and dashboard React Query caches
  // so that assign/unassign casher immediately updates Trips and Live Map
  queryClient.invalidateQueries({ queryKey: ["trips"] });
  queryClient.invalidateQueries({ queryKey: ["tracking"] });
  queryClient.invalidateQueries({ queryKey: ["live-buses"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
}

export function useCreateBus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<PhysicalBus, AppError, CreateBusFormData>({
    mutationFn: (data) => busesApi.createBus(data),
    onSuccess: (newBus) => {
      invalidateFleetRelatedQueries(queryClient, newBus.id);
      toast({
        title: "Bus Created",
        description: `Bus ${newBus.targa} was successfully registered.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create bus",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateBus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<PhysicalBus, AppError, { id: string; data: UpdateBusFormData }>({
    mutationFn: ({ id, data }) => busesApi.updateBus(id, data),
    onSuccess: (updated) => {
      invalidateFleetRelatedQueries(queryClient, updated.id);
      toast({
        title: "Bus Updated",
        description: `Bus ${updated.targa} was successfully updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update bus",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRetireBus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<PhysicalBus, AppError, string>({
    mutationFn: (id: string) => busesApi.retireBus(id),
    onSuccess: (retired) => {
      invalidateFleetRelatedQueries(queryClient, retired.id);
      toast({
        title: "Bus Retired",
        description: `Bus ${retired.targa} has been marked as retired.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to retire bus",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBusMaintenance(busId?: string) {
  return useQuery({
    queryKey: busKeys.maintenanceList(busId),
    queryFn: () => (busId ? busesApi.getBusMaintenance(busId) : busesApi.getAllMaintenance()),
    enabled: busId !== undefined ? Boolean(busId) : true,
  });
}

export function useAllMaintenance(filters?: { ended_at__isnull?: boolean | string }) {
  return useQuery({
    queryKey: [...busKeys.maintenances(), filters ?? {}],
    queryFn: () => busesApi.getAllMaintenance(filters),
  });
}

export function useSendToMaintenance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    unknown,
    AppError,
    { busId: string; data: MaintenanceStartFormData }
  >({
    mutationFn: ({ busId, data }) => busesApi.sendToMaintenance(busId, data),
    onSuccess: (_, { busId }) => {
      invalidateFleetRelatedQueries(queryClient, busId);
      toast({
        title: "Sent to Maintenance",
        description: "Bus status updated to maintenance.",
      });
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/** Alias for useSendToMaintenance matching naming in fleet domain */
export const useCreateMaintenance = useSendToMaintenance;

export function useResumeBus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<unknown, AppError, string>({
    mutationFn: (busId: string) => busesApi.resumeBus(busId),
    onSuccess: (_, busId) => {
      invalidateFleetRelatedQueries(queryClient, busId);
      toast({
        title: "Bus Resumed",
        description: "Bus status restored to active.",
      });
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBusTrips(busId?: string) {
  return useQuery({
    queryKey: busId ? busKeys.trips(busId) : ["buses", "no-id", "trips"],
    queryFn: () => (busId ? busesApi.getBusTrips(busId) : Promise.resolve([])),
    enabled: Boolean(busId),
  });
}
