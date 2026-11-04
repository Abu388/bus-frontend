import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faresApi } from "./api";
import { fareKeys } from "./keys";
import type { Fare, FareHistory, CreateFareFormData } from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";
import { formatETB } from "@/shared/lib/format";

export function useFares(params?: { active?: boolean; route?: string }) {
  return useQuery({
    queryKey: fareKeys.list(params),
    queryFn: () => faresApi.getFares(params),
  });
}

export function useFareHistory(params?: { route?: string }) {
  return useQuery({
    queryKey: fareKeys.history(params),
    queryFn: () => faresApi.getFareHistory(params),
  });
}

export function useCreateFare() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Fare, AppError, CreateFareFormData>({
    mutationFn: (data) => faresApi.createFare(data),
    onSuccess: (newFare) => {
      queryClient.invalidateQueries({ queryKey: fareKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fareKeys.histories() });
      toast({
        title: "Fare Updated",
        description: `New fare of ${formatETB(newFare.amount)} is now active. Historical trip totals remain unchanged.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update fare",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
