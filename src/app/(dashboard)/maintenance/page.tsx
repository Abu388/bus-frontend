"use client";

import * as React from "react";
import { useAllMaintenance, useResumeBus, useBuses, type MaintenanceEvent } from "@/features/buses";
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
import { StatusPill } from "@/shared/ui/status-pill";
import { Skeleton } from "@/shared/ui/skeleton";
import { NavIcon } from "@/shared/ui/icons";
import { formatDate, formatTime12h, formatDateTime } from "@/shared/lib/format";

type FilterStatus = "all" | "open" | "closed";

export default function MaintenancePage() {
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("open");

  // Query buses to map bus ID to targa
  const busesQuery = useBuses();
  const buses = busesQuery.data || [];
  const busMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const b of buses) {
      if (b.id) map.set(b.id, b.targa);
    }
    return map;
  }, [buses]);

  // Query maintenance events with filter
  const maintenanceParams = React.useMemo(() => {
    if (statusFilter === "open") return { ended_at__isnull: true };
    if (statusFilter === "closed") return { ended_at__isnull: false };
    return undefined;
  }, [statusFilter]);

  const maintenanceQuery = useAllMaintenance(maintenanceParams);
  const events = maintenanceQuery.data || [];

  // Resume mutation
  const resumeMutation = useResumeBus();

  const handleResume = (busId: string) => {
    if (confirm("Restore this vehicle to active fleet service?")) {
      resumeMutation.mutate(busId);
    }
  };

  const openCount = React.useMemo(() => {
    return events.filter((e) => !e.ended_at).length;
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <NavIcon name="wrench" className="h-5 w-5" />
            </span>
            Fleet Maintenance & Workshop
          </h1>
          <p className="text-sm text-muted-foreground">
            Track mechanical work orders, repair durations, downtime logging, and fleet return-to-service authorizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {events.length} Records
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={statusFilter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("open")}
          className="h-8 text-xs flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
          Active Workshop ({statusFilter === "open" ? events.length : "Open"})
        </Button>
        <Button
          variant={statusFilter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("closed")}
          className="h-8 text-xs"
        >
          Resolved / Completed
        </Button>
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
          className="h-8 text-xs"
        >
          All History
        </Button>
      </div>

      {/* Events Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold">Maintenance Work Orders</CardTitle>
          <CardDescription>
            Buses currently grounded or historically repaired. Resuming a bus marks the work order complete and returns the bus to active duty.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {maintenanceQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {statusFilter === "open"
                ? "No buses are currently under maintenance. Fleet is fully operational!"
                : "No maintenance records match this filter."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Plate (Targa)</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Work Order Started</TableHead>
                    <TableHead>Work Order Ended</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event: MaintenanceEvent) => {
                    const isOpen = !event.ended_at;
                    const plate = (event.bus && busMap.get(event.bus)) || event.bus || "Unknown Bus";

                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <span className="font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded text-xs">
                            {plate}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-xs">
                          {event.reason}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {event.description || "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-foreground">
                          <div>{formatTime12h(event.started_at)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDate(event.started_at)}</div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {event.ended_at ? (
                            <div>
                              <div className="text-foreground">{formatTime12h(event.ended_at)}</div>
                              <div className="text-[10px] text-muted-foreground">{formatDate(event.ended_at)}</div>
                            </div>
                          ) : (
                            <span className="text-danger font-medium animate-pulse">In Workshop</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={isOpen ? "maintenance" : "active"}
                            label={isOpen ? "In Workshop" : "Resolved"}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {isOpen && event.bus ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-success/40 text-success hover:bg-success/10 hover:text-success"
                              onClick={() => handleResume(event.bus!)}
                              disabled={resumeMutation.isPending}
                            >
                              {resumeMutation.isPending ? "Resuming..." : "Resume Service →"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
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
