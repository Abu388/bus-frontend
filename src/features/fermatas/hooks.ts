import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fermatasApi } from "./api";
import { fermataKeys } from "./keys";
import { routeKeys } from "@/features/routes/keys";
import { stopKeys } from "@/features/stops/keys";
import { directionKeys } from "@/features/directions/keys";
import type { Fermata, CreateFermataFormData, UpdateFermataFormData } from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

export function useFermatas() {
  return useQuery({
    queryKey: fermataKeys.lists(),
    queryFn: () => fermatasApi.getFermatas(),
  });
}

export function useFermata(id: string) {
  return useQuery({
    queryKey: fermataKeys.detail(id),
    queryFn: () => fermatasApi.getFermata(id),
    enabled: Boolean(id),
  });
}

export function useCreateFermata() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Fermata, AppError, CreateFermataFormData>({
    mutationFn: (data) => fermatasApi.createFermata(data),
    onSuccess: (newFermata) => {
      queryClient.invalidateQueries({ queryKey: fermataKeys.lists() });
      toast({
        title: "Fermata Created",
        description: `Fermata "${newFermata.name}" created successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create fermata",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateFermata() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Fermata, AppError, { id: string; data: UpdateFermataFormData }>({
    mutationFn: ({ id, data }) => fermatasApi.updateFermata(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: fermataKeys.lists() });
      if (updated.id) {
        queryClient.invalidateQueries({ queryKey: fermataKeys.detail(updated.id) });
      }
      toast({
        title: "Fermata Updated",
        description: `Fermata "${updated.name}" updated successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update fermata",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFermata() {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, string>({
    mutationFn: (id: string) => fermatasApi.deleteFermata(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fermataKeys.all });
      queryClient.invalidateQueries({ queryKey: routeKeys.all });
      queryClient.invalidateQueries({ queryKey: stopKeys.all });
      queryClient.invalidateQueries({ queryKey: directionKeys.all });
    },
    // Errors are surfaced inline inside the delete confirmation dialog.
  });
}
