"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAdminTrips, useTripPayments, type BusTripReport, type Payment } from "@/features/trips";
import { useRoutes } from "@/features/routes";
import { useBuses } from "@/features/buses";
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
import { StatusPill } from "@/shared/ui/status-pill";
import { Skeleton } from "@/shared/ui/skeleton";
import { NavIcon } from "@/shared/ui/icons";
import { formatETB, formatTime12h, formatDate, formatDateTime } from "@/shared/lib/format";

function TripsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL search params
  const busParam = searchParams.get("bus") || "";
  const routeParam = searchParams.get("route") || "";
  const statusParam = (searchParams.get("status") as "active" | "ended") || undefined;
  const dateFromParam = searchParams.get("date_from") || "";
  const dateToParam = searchParams.get("date_to") || "";

  // Selected trip for drawer
  const [selectedTrip, setSelectedTrip] = React.useState<BusTripReport | null>(null);

  // Queries
  const routesQuery = useRoutes();
  const busesQuery = useBuses();

  const filterParams = React.useMemo(() => {
    return {
      bus: busParam || undefined,
      route: routeParam || undefined,
      status: statusParam,
      date_from: dateFromParam || undefined,
      date_to: dateToParam || undefined,
    };
  }, [busParam, routeParam, statusParam, dateFromParam, dateToParam]);

  const tripsQuery = useAdminTrips(filterParams);
  const trips = tripsQuery.data?.items || [];
  const totalTripsCount = tripsQuery.data?.meta?.total ?? trips.length;

  // Payments query for selected trip
  const paymentsQuery = useTripPayments(selectedTrip?.id);
  const payments = paymentsQuery.data || [];

  // Helper to update URL search params
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
    busParam || routeParam || statusParam || dateFromParam || dateToParam
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <NavIcon name="ticket" className="h-5 w-5" />
            </span>
            Trips & Operations Log
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor real-time and historical vehicle journeys, passenger loads, and onboard fare reconciliations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {totalTripsCount} Total Trips
          </Badge>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Route filter */}
          <div className="space-y-1">
            <label htmlFor="filter-route" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Route / Line
            </label>
            <select
              id="filter-route"
              value={routeParam}
              onChange={(e) => updateFilters({ route: e.target.value || undefined })}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Routes</option>
              {routesQuery.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  Line {r.public_bus_number}: {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bus Plate filter */}
          <div className="space-y-1">
            <label htmlFor="filter-bus" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Bus Plate (Targa)
            </label>
            <select
              id="filter-bus"
              value={busParam}
              onChange={(e) => updateFilters({ bus: e.target.value || undefined })}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Buses</option>
              {busesQuery.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.targa}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <label htmlFor="filter-status" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Trip Status
            </label>
            <select
              id="filter-status"
              value={statusParam || ""}
              onChange={(e) => updateFilters({ status: e.target.value || undefined })}
              className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="active">Active (En Route)</option>
              <option value="ended">Ended (Completed)</option>
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label htmlFor="filter-date-from" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Date From
            </label>
            <Input
              id="filter-date-from"
              type="date"
              value={dateFromParam}
              onChange={(e) => updateFilters({ date_from: e.target.value || undefined })}
              className="h-9 text-xs"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label htmlFor="filter-date-to" className="text-[11px] font-semibold uppercase text-muted-foreground">
              Date To
            </label>
            <Input
              id="filter-date-to"
              type="date"
              value={dateToParam}
              onChange={(e) => updateFilters({ date_to: e.target.value || undefined })}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Quick Date Presets & Clear */}
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

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 text-xs"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Trips Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold">Logged Journeys</CardTitle>
          <CardDescription>
            Times are rendered in 12-hour Addis Ababa local time (EAT / UTC+3). Click any trip to view passenger payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tripsQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm">No trips match the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip / Label</TableHead>
                    <TableHead>Bus Plate</TableHead>
                    <TableHead>Line / Route</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Ended At</TableHead>
                    <TableHead className="text-right">Passengers</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => {
                    const isActive = trip.status === "active";
                    return (
                      <TableRow
                        key={trip.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setSelectedTrip(trip)}
                      >
                        <TableCell>
                          <div className="font-semibold text-foreground">
                            #{trip.number || "—"}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                            {trip.summary_label || "Journey"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-xs">
                            {trip.bus_targa || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {trip.public_bus_number ? `Line ${trip.public_bus_number}` : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {trip.route_name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs capitalize text-muted-foreground">
                            {trip.direction || "outbound"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-foreground">
                          <div>{formatTime12h(trip.started_at)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDate(trip.started_at)}</div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {trip.ended_at ? (
                            <div>
                              <div className="text-foreground">{formatTime12h(trip.ended_at)}</div>
                              <div className="text-[10px] text-muted-foreground">{formatDate(trip.ended_at)}</div>
                            </div>
                          ) : (
                            <span className="text-primary font-medium animate-pulse">En route</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {trip.passenger_count ?? 0}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatETB(trip.revenue)}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={isActive ? "active" : "inactive"}
                            label={isActive ? "Active" : "Completed"}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrip(trip);
                            }}
                          >
                            Payments →
                          </Button>
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

      {/* Trip Payment Detail Drawer / Modal */}
      {selectedTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedTrip(null)}
        >
          <div
            className="h-full w-full max-w-xl bg-card border-l border-border p-6 shadow-2xl overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    Trip #{selectedTrip.number}
                  </Badge>
                  <StatusPill
                    status={selectedTrip.status === "active" ? "active" : "inactive"}
                    label={selectedTrip.status === "active" ? "En Route" : "Ended"}
                  />
                </div>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  {selectedTrip.summary_label || `Journey on ${selectedTrip.bus_targa}`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Line {selectedTrip.public_bus_number}: {selectedTrip.route_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-[11px] text-muted-foreground uppercase">Bus Plate</span>
                <p className="text-sm font-bold font-mono text-foreground mt-0.5">{selectedTrip.bus_targa}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-[11px] text-muted-foreground uppercase">Passengers</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{selectedTrip.passenger_count}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-[11px] text-muted-foreground uppercase">Total Revenue</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{formatETB(selectedTrip.revenue)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-[11px] text-muted-foreground uppercase">Direction</span>
                <p className="text-sm font-bold capitalize text-foreground mt-0.5">{selectedTrip.direction}</p>
              </div>
            </div>

            {/* Timing Details */}
            <div className="rounded-lg border border-border bg-background p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Departure Time:</span>
                <span className="font-medium text-foreground">{formatDateTime(selectedTrip.started_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrival / End Time:</span>
                <span className="font-medium text-foreground">
                  {selectedTrip.ended_at ? formatDateTime(selectedTrip.ended_at) : "Currently ongoing"}
                </span>
              </div>
            </div>

            {/* Payment Audit Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <NavIcon name="tag" className="h-4 w-4 text-primary" />
                  Payments Reconciled ({payments.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                  From GET /api/trips/{selectedTrip.id}/payments/
                </span>
              </div>

              {paymentsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
                  No onboard transactions recorded yet for this trip.
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Ref</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid At</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p: Payment) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">
                            {p.provider_ref ? p.provider_ref.slice(0, 10) : p.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-xs capitalize text-foreground">
                            {p.provider || "Standard"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {formatETB(p.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {p.paid_at ? formatTime12h(p.paid_at) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={p.status === "succeeded" ? "accent" : "outline"}
                              className="text-[10px] capitalize"
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setSelectedTrip(null)}>
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TripsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading trips...</div>}>
      <TripsContent />
    </React.Suspense>
  );
}
