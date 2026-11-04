"use client";

import * as React from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useReportsSummary } from "@/features/reports";
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
import { Skeleton } from "@/shared/ui/skeleton";
import { NavIcon } from "@/shared/ui/icons";
import { formatETB, formatDate } from "@/shared/lib/format";

export default function ReportsPage() {
  const [rangePreset, setRangePreset] = React.useState<"today" | "7d" | "30d">("7d");

  const dateParams = React.useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    if (rangePreset === "today") {
      return { date_from: todayStr, date_to: todayStr };
    }
    const days = rangePreset === "7d" ? 7 : 30;
    const past = new Date(today);
    past.setDate(past.getDate() - days);
    return { date_from: past.toISOString().split("T")[0], date_to: todayStr };
  }, [rangePreset]);

  const { data: summary, isLoading } = useReportsSummary(dateParams);
  const { data: routes } = useRoutes();
  const { data: buses } = useBuses();

  const totals = summary?.totals ?? { trips_count: 0, passengers_count: 0, revenue: "0" };

  // Chart data: Route passenger demand
  const routeDemandData = React.useMemo(() => {
    if (!summary?.by_route) return [];
    return summary.by_route.map((r) => ({
      name: `Line ${r.public_bus_number}`,
      passengers: r.passengers,
      revenue: parseFloat(r.revenue) || 0,
    }));
  }, [summary?.by_route]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <NavIcon name="bar-chart" className="h-5 w-5" />
            </span>
            Executive Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            High-level operational performance, route load distribution, and executive audit summaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={rangePreset === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setRangePreset("today")}
            className="h-8 text-xs"
          >
            Today
          </Button>
          <Button
            variant={rangePreset === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setRangePreset("7d")}
            className="h-8 text-xs"
          >
            7 Days
          </Button>
          <Button
            variant={rangePreset === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setRangePreset("30d")}
            className="h-8 text-xs"
          >
            30 Days
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <Card className="border-border bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Gross Revenue
              </span>
              <div className="text-3xl font-bold tracking-tight text-foreground mt-2">
                {formatETB(totals.revenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {totals.trips_count} scheduled trips
              </p>
            </Card>

            <Card className="border-border bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Passenger Throughput
              </span>
              <div className="text-3xl font-bold tracking-tight text-foreground mt-2">
                {totals.passengers_count.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {summary?.by_route?.length ?? 0} active transit lines
              </p>
            </Card>

            <Card className="border-border bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fleet Utilization
              </span>
              <div className="text-3xl font-bold tracking-tight text-foreground mt-2">
                {summary?.by_bus?.length ?? 0} <span className="text-sm font-normal text-muted-foreground">/ {buses?.length ?? 0} buses</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active in service this window
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Route Passenger Demand Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 border-b border-border">
          <CardTitle className="text-base font-semibold">Route Passenger Volume</CardTitle>
          <CardDescription>
            Comparing passenger ridership across all active bus lines.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : routeDemandData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              No route demand records found for this timeframe.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeDemandData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: any) => [
                      name === "passengers" ? `${val} riders` : formatETB(val),
                      name === "passengers" ? "Passengers" : "Revenue",
                    ]}
                  />
                  <Bar dataKey="passengers" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Navigation to Detailed Domains */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/payments" className="block">
          <Card className="border-border bg-card p-4 hover:border-primary transition-colors cursor-pointer">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <span>💳</span> Financial Reconciliation →
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Deep dive into daily cash flows, bus takings, and electronic payments.
            </p>
          </Card>
        </Link>

        <Link href="/trips" className="block">
          <Card className="border-border bg-card p-4 hover:border-primary transition-colors cursor-pointer">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <span>🕒</span> Dispatched Trips Log →
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Detailed trip-by-trip audit logs with local 12h Addis Ababa departure timestamps.
            </p>
          </Card>
        </Link>

        <Link href="/fleet/buses" className="block">
          <Card className="border-border bg-card p-4 hover:border-primary transition-colors cursor-pointer">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <span>🚌</span> Fleet Asset Status →
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Maintenance logs, bus trip histories, and service resumption workflows.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
