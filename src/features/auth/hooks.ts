import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "./api";
import { authKeys } from "./keys";
import type { LoginFormData, AuthUser } from "./schemas";
import { useToast } from "@/shared/ui/toast";
import { AppError } from "@/shared/api/errors";

const subscribeToNothing = () => () => {};

function useIsClient() {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

export function useAuth() {
  const isClient = useIsClient();
  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const res = await authApi.getMe();
      return res.user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: isClient,
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: Boolean(query.data),
    isAdmin: query.data?.role === "admin",
    refetch: query.refetch,
    error: query.error,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation<{ user: AuthUser }, AppError, LoginFormData>({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me(), data.user);
      toast({
        title: "Welcome back",
        description: `Logged in as ${data.user.full_name || data.user.username}`,
        variant: "default",
      });
      router.push("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials.",
        variant: "destructive",
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation<{ ok: boolean }, AppError, void>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Signed Out",
        description: "You have been logged out.",
      });
      router.push("/login");
    },
    onError: (error) => {
      toast({
        title: "Logout Error",
        description: error.message,
        variant: "destructive",
      });
      router.push("/login");
    },
  });
}
