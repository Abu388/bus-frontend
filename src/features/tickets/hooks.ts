import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "./api";
import { ticketKeys } from "./keys";
import type { TicketValidateInput } from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

export function useTickets(params?: Record<string, string | number | boolean | null | undefined>) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => ticketsApi.getTickets(params),
  });
}

export function useTicket(id?: string) {
  return useQuery({
    queryKey: id ? ticketKeys.detail(id) : ["tickets", "detail", "none"],
    queryFn: () => (id ? ticketsApi.getTicket(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useTicketCode(id?: string) {
  return useQuery({
    queryKey: id ? ticketKeys.code(id) : ["tickets", "code", "none"],
    queryFn: () => (id ? ticketsApi.getTicketCode(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useValidateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<unknown, AppError, TicketValidateInput>({
    mutationFn: (input: TicketValidateInput) => ticketsApi.validateTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      toast({
        title: "Ticket Validated",
        description: "The ticket code has been verified successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
