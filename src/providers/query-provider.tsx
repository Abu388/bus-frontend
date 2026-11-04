"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/shared/lib/query-client";
import { httpClient } from "@/shared/api/client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // QueryClient instance created once per client session
  const [queryClient] = React.useState(() => createQueryClient());

  React.useEffect(() => {
    // Warm the backend health check on application load
    httpClient.warmBackend();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
