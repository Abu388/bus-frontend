import { useQuery } from "@tanstack/react-query";
import { auditApi } from "./api";
import { auditKeys } from "./keys";
import type { AuditFilters } from "./schemas";

export function useAuditLogs(filters?: AuditFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => auditApi.getAuditLogs(filters),
  });
}
