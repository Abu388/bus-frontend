import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/ui/toast";
import { usersApi } from "./api";
import { userKeys } from "./keys";
import type { CasherUser, CreateCasherFormData } from "./schemas";

export function useCashers() {
  return useQuery<CasherUser[]>({
    queryKey: userKeys.cashers(),
    queryFn: () => usersApi.getCashers(),
  });
}

export function useCreateCasher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCasherFormData) => usersApi.createCasher(data),
    onSuccess: (newUser) => {
      // Invalidate both "users" root and "cashers" caches
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.cashers() });
      toast({
        title: "Casher Created",
        description: `Casher created: ${newUser.email}`,
        variant: "success",
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to create user account. Please check the inputs.";
      toast({
        title: "Creation Failed",
        description: message,
        variant: "danger",
      });
    },
  });
}
