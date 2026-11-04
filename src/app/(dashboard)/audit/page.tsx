"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuditLogs, type AuditLog } from "@/features/audit";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { NavIcon } from "@/shared/ui/icons";
import { formatDate, formatTime12h } from "@/shared/lib/format";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "fare.changed", label: "Fare Changed" },
  { value: "bus.maintenance_started", label: "Maintenance Started" },
  { value: "bus.maintenance_ended", label: "Maintenance Ended" },
  { value: "trip.started", label: "Trip Started" },
  { value: "trip.ended", label: "Trip Ended" },
  { value: "route.updated", label: "Route Updated" },
  { value: "user.role_changed", label: "User Role Changed" },
  { value: "user.suspended", label: "User Suspended" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All Entities" },
  { value: "fare", label: "Fare" },
  { value: "bus", label: "Bus" },
  { value: "trip", label: "Trip" },
  { value: "route", label: "Route" },
  { value: "user", label: "User" },
];

function AuditContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL search params
  const actorParam = searchParams.get("actor") || "";
  const actionParam = searchParams.get("action") || "";
  const entityTypeParam = searchParams.get("entity_type") || "";
  const dateFromParam = searchParams.get("date_from") || "";
  const dateToParam = searchParams.get("date_to") || "";

  // State for expanded rows (set of log IDs)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = (ids: string[]) => {
    setExpandedRows(new Set(ids));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  const filterParams = React.useMemo(() => {
    return {
      actor: actorParam || undefined,
      action: actionParam || undefined,
      entity_type: entityTypeParam || undefined,
      date_from: dateFromParam || undefined,
      date_to: dateToParam || undefined,
    };
  }, [actorParam, actionParam, entityTypeParam, dateFromParam, dateToParam]);

  const { data: auditData, isLoading } = useAuditLogs(filterParams);
  const logs = auditData?.items || [];
  const totalCount = auditData?.meta?.total ?? logs.length;

  const updateFilters = (newParams: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(newParams)) {
      if (v) {
        sp.set(k, v);
      } else {
        sp.delete(k);
      }
    }
    router.replace(`${pathname}?${sp.toString()}`);
  };

  const handleDatePreset = (preset: "today" | "7d" | "30d" | "all") => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (preset === "today") {
      updateFilters({ date_from: todayStr, date_to: todayStr });
    } else if (preset === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      updateFilters({ date_from: past.toISOString().split("T")[0], date_to: todayStr });
    } else if (preset === "30d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      updateFilters({ date_from: past.toISOString().split("T")[0], date_to: todayStr });
    } else {
      updateFilters({ date_from: undefined, date_to: undefined });
    }
  };

  const handleClearFilters = () => {
    router.replace(pathname);
  };

  const hasActiveFilters = Boolean(
    actorParam || actionParam || entityTypeParam || dateFromParam || dateToParam
  );

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("maintenance")) return "outline";
    if (action.includes("fare")) return "accent";
    if (action.includes("trip")) return "default";
    return "outline";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <NavIcon name="shield-alert" className="h-5 w-5" />
            </span>
            System Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground">
            Immutable, read-only audit log recording administrative operations, tariff modifications, and fleet state transitions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {totalCount} Total Entries
          </Badge>
          <Badge variant="accent" className="text-xs font-mono">
            Read-Only
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Action Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-action" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Event Action
            </label>
            <select
              id="filter-action"
              value={actionParam}
              onChange={(e) => updateFilters({ action: e.target.value || undefined })}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-entity" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Entity Type
            </label>
            <select
              id="filter-entity"
              value={entityTypeParam}
              onChange={(e) => updateFilters({ entity_type: e.target.value || undefined })}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actor Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-actor" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Actor ID / Search
            </label>
            <Input
              id="filter-actor"
              placeholder="Search by actor ID..."
              value={actorParam}
              onChange={(e) => updateFilters({ actor: e.target.value || undefined })}
              className="h-9 text-xs"
            />
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label htmlFor="audit-date-from" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Date From
            </label>
            <Input
              id="audit-date-from"
              type="date"
              value={dateFromParam}
              onChange={(e) => updateFilters({ date_from: e.target.value || undefined })}
              className="h-9 text-xs"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label htmlFor="audit-date-to" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Date To
            </label>
            <Input
              id="audit-date-to"
              type="date"
              value={dateToParam}
              onChange={(e) => updateFilters({ date_to: e.target.value || undefined })}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Date presets and clear */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground mr-1">Presets:</span>
            <button
              onClick={() => handleDatePreset("today")}
              className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium"
            >
              Today
            </button>
            <button
              onClick={() => handleDatePreset("7d")}
              className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDatePreset("30d")}
              className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleDatePreset("all")}
              className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors font-medium"
            >
              All Time
            </button>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <>
                <button
                  onClick={() => expandAll(logs.map((l) => l.id))}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Expand All Metadata
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  onClick={collapseAll}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Collapse All
                </button>
              </>
            )}

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs ml-2"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold">Audit Records</CardTitle>
          <CardDescription>
            All times recorded in 12-hour Addis Ababa local time (EAT / UTC+3). Click any row to inspect structured metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No audit log entries match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: AuditLog) => {
                    const isExpanded = expandedRows.has(log.id);

                    return (
                      <React.Fragment key={log.id}>
                        <TableRow
                          onClick={() => toggleRow(log.id)}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                        >
                          <TableCell className="w-10 text-center text-muted-foreground font-mono text-xs">
                            {isExpanded ? "▼" : "▶"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-foreground">
                            <div className="font-medium">{formatTime12h(log.created_at)}</div>
                            <div className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getActionBadgeVariant(log.action)}
                              className="text-[11px] font-mono capitalize"
                            >
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold capitalize text-foreground">
                            {log.entity_type}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-foreground">
                            {log.actor_id ? log.actor_id.slice(0, 8) + "..." : "System"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground capitalize">
                            <Badge variant="outline" className="text-[10px]">
                              {log.actor_role || log.actor_kind || "System"}
                            </Badge>
                          </TableCell>
                        </TableRow>

                        {/* Expandable JSON Metadata */}
                        {isExpanded && (
                          <TableRow className="bg-muted/20 border-b border-border">
                            <TableCell colSpan={7} className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                                    Event Payload & Structured Metadata
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    Log ID: {log.id}
                                  </span>
                                </div>
                                <div className="rounded-lg border border-border bg-background p-3">
                                  {log.metadata && typeof log.metadata === "object" ? (
                                    <pre className="text-xs font-mono text-foreground overflow-x-auto max-h-72 whitespace-pre-wrap">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                      No additional metadata attached to this event.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading audit log...</div>}>
      <AuditContent />
    </React.Suspense>
  );
}
