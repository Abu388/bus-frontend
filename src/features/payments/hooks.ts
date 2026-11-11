import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "./api";
import { paymentKeys } from "./keys";

export function usePayments(params?: Record<string, string | number | boolean | null | undefined>) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentsApi.getPayments(params),
  });
}

export function usePayment(id?: string) {
  return useQuery({
    queryKey: id ? paymentKeys.detail(id) : ["payments", "detail", "none"],
    queryFn: () => (id ? paymentsApi.getPayment(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useTripPayments(tripId?: string) {
  return useQuery({
    queryKey: tripId ? ["trips", tripId, "payments"] : ["trips", "none", "payments"],
    queryFn: () => (tripId ? paymentsApi.getTripPayments(tripId) : Promise.resolve([])),
    enabled: Boolean(tripId),
  });
}
