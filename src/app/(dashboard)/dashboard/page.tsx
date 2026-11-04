"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  StatusPill,
  Skeleton,
} from "@/shared/ui";
import {
  BusIcon,
  TripIcon,
  PaymentIcon,
  WrenchIcon,
  UsersIcon,
  RefreshIcon,
  ArrowRightIcon,
} from "@/shared/ui/icons";
import { formatETB, formatTime12h, formatDate } from "@/shared/lib/format";
import { useReportsSummary } from "@/features/reports";
import { useLiveBuses } from "@/features/tracking";
import { useBuses } from "@/features/buses";
import { useAdminTrips } from "@/features/trips";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Date range filter from URL or default to 7 days
  const rangeType = searchParams.get("range") || "7d";
  const customFrom = searchParams.get("date_from") || "";
  const customTo = searchParams.get("date_to") || "";

  const computedDateRange = React.useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (rangeType === "today") {
      return { date_from: todayStr, date_to: todayStr };
    }
    if (rangeType === "7d") {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      return { date_from: past.toISOString().split("T")[0], date_to: todayStr };
    }
    if (rangeType === "custom" && customFrom && customTo) {
      return { date_from: customFrom, date_to: customTo };
    }
    return undefined;
  }, [rangeType, customFrom, customTo]);

  const handleRangeChange = (newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", newRange);
    if (newRange !== "custom") {
      params.delete("date_from");
      params.delete("date_to");
    }
    router.push(`?${params.toString()}`);
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const from = formData.get("date_from") as string;
    const to = formData.get("date_to") as string;
    if (from && to) {
      const params = new URLSearchParams();
      params.set("range", "custom");
      params.set("date_from", from);
      params.set("date_to", to);
      router.push(`?${params.toString()}`);
    }
  };

  // Queries
  const summaryQuery = useReportsSummary(computedDateRange);
  const liveBusesQuery = useLiveBuses();
  const maintenanceBusesQuery = useBuses({ status: "maintenance" });
  const recentTripsQuery = useAdminTrips({ page_size: 5 });

  const totals = summaryQuery.data?.totals;
  const liveCount = liveBusesQuery.data?.length ?? 0;
  const maintenanceCount = maintenanceBusesQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fleet Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live overview of bus operations, ridership metrics, and revenue.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-1 text-xs">
            <button
              onClick={() => handleRangeChange("today")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                rangeType === "today" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleRangeChange("7d")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                rangeType === "7d" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleRangeChange("custom")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                rangeType === "custom" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              summaryQuery.refetch();
              recentTripsQuery.refetch();
            }}
            disabled={summaryQuery.isFetching}
            title="Refresh metrics"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${summaryQuery.isFetching ? "animate-spin" : ""}`} />
            <span className="sr-only sm:not-sr-only sm:ml-1">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Form (if active) */}
      {rangeType === "custom" && (
        <Card className="border-border bg-card/60 p-4">
          <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="date_from" className="font-medium text-foreground">From:</label>
              <input
                id="date_from"
                name="date_from"
                type="date"
                defaultValue={customFrom}
                required
                className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="date_to" className="font-medium text-foreground">To:</label>
              <input
                id="date_to"
                name="date_to"
                type="date"
                defaultValue={customTo}
                required
                className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button type="submit" size="sm" variant="default">Apply Range</Button>
          </form>
        </Card>
      )}

      {/* Error state */}
      {summaryQuery.isError && (
        <Card className="border-danger/30 bg-danger/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-danger text-sm">Failed to load dashboard metrics</p>
              <p className="text-xs text-muted-foreground">{summaryQuery.error.message}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => summaryQuery.refetch()}>Retry</Button>
          </div>
        </Card>
      )}

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Revenue */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </CardTitle>
            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
              <PaymentIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {formatETB(totals?.revenue ?? "0.00")}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Ticket receipts collected</p>
          </CardContent>
        </Card>

        {/* Total Passengers */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Passengers
            </CardTitle>
            <div className="rounded-md bg-accent/10 p-1.5 text-accent">
              <UsersIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {(totals?.passengers_count ?? 0).toLocaleString()}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Recorded boarding count</p>
          </CardContent>
        </Card>

        {/* Total Trips */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Trips Run
            </CardTitle>
            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
              <TripIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {(totals?.trips_count ?? 0).toLocaleString()}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Scheduled & active trips</p>
          </CardContent>
        </Card>

        {/* Live Active Buses */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Buses
            </CardTitle>
            <div className="rounded-md bg-success/10 p-1.5 text-success">
              <BusIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {liveBusesQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">{liveCount}</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              <Link href="/fleet/map" className="hover:text-primary hover:underline">
                View fleet map →
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* In Maintenance */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              In Maintenance
            </CardTitle>
            <div className="rounded-md bg-warning/10 p-1.5 text-warning">
              <WrenchIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {maintenanceBusesQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono text-warning">
                {maintenanceCount}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              <Link href="/maintenance" className="hover:text-warning hover:underline">
                View garage logs →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/fleet/map" className="group">
          <Card className="border-border bg-card hover:border-primary/50 transition-all p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:scale-105 transition-transform">
                <BusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Live Fleet Map</p>
                <p className="text-xs text-muted-foreground">Track buses in real-time on OSM</p>
              </div>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>

        <Link href="/routes" className="group">
          <Card className="border-border bg-card hover:border-primary/50 transition-all p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2.5 text-accent group-hover:scale-105 transition-transform">
                <TripIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Routes & Fermatas</p>
                <p className="text-xs text-muted-foreground">Manage line sequences and stops</p>
              </div>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>

        <Link href="/reports" className="group">
          <Card className="border-border bg-card hover:border-primary/50 transition-all p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2.5 text-success group-hover:scale-105 transition-transform">
                <PaymentIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Financial Reports</p>
                <p className="text-xs text-muted-foreground">Full revenue charts and breakdowns</p>
              </div>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>
      </div>

      {/* Recent Trips Table */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Trips</CardTitle>
            <CardDescription>Latest bus dispatches and active routes</CardDescription>
          </div>
          <Link href="/trips">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <span>All Trips</span>
              <ArrowRightIcon className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTripsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentTripsQuery.isError ? (
            <div className="p-6 text-center text-xs text-danger">
              Failed to load recent trips. Please retry.
            </div>
          ) : recentTripsQuery.data?.items.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No recent trips recorded. Dispatches will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Trip / Bus</th>
                    <th className="py-2.5 px-3 font-semibold">Route</th>
                    <th className="py-2.5 px-3 font-semibold">Direction</th>
                    <th className="py-2.5 px-3 font-semibold">Started</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Passengers</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentTripsQuery.data?.items.map((trip) => (
                    <tr key={trip.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">#{trip.number}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{trip.bus_targa}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-foreground">Line {trip.public_bus_number}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">{trip.route_name}</div>
                      </td>
                      <td className="py-2.5 px-3 capitalize text-muted-foreground">
                        {trip.direction}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        <div>{formatTime12h(trip.started_at)}</div>
                        <div className="text-[10px] opacity-75">{formatDate(trip.started_at)}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusPill status={trip.status === "active" ? "active" : "ended"} />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {trip.passenger_count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                        {formatETB(trip.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>}>
      <DashboardContent />
    </React.Suspense>
  );
}
