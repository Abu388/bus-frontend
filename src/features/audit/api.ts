import { httpClient } from "@/shared/api/client";
import { unwrapList, extractPaginationMeta, type ListResponse, type PaginationMeta } from "@/shared/api/types";
import type { AuditLog, AuditFilters } from "./schemas";

export interface AdminAuditResult {
  items: AuditLog[];
  meta: PaginationMeta;
}

export const auditApi = {
  async getAuditLogs(filters?: AuditFilters): Promise<AdminAuditResult> {
    const res = await httpClient.get<ListResponse<AuditLog>>("/admin/audit/", {
      params: filters as Record<string, string | number | boolean | undefined | null>,
    });
    return {
      items: unwrapList(res),
      meta: extractPaginationMeta(res),
    };
  },
};
