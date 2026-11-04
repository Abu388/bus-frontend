"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useReportsSummary } from "@/features/reports";
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
import { formatETB, formatDate } from "@/shared/lib/format";

type DatePreset = "today" | "7d" | "30d" | "all";
type ActiveTab = "routes" | "days" | "buses";

function PaymentsContent() {
  const [preset, setPreset] = React.useState<DatePreset>("7d");
  const [dateFrom, setDateFrom] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("routes");

  const queryParams = React.useMemo(() => {
    if (preset === "all") return undefined;
    return {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
  }, [preset, dateFrom, dateTo]);

  const { data: summary, isLoading } = useReportsSummary(queryParams);

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (newPreset === "today") {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (newPreset === "7d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      setDateFrom(past.toISOString().split("T")[0]);
      setDateTo(todayStr);
    } else if (newPreset === "30d") {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      setDateFrom(past.toISOString().split("T")[0]);
      setDateTo(todayStr);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  };

  const totals = summary?.totals ?? { trips_count: 0, passengers_count: 0, revenue: "0" };
  const totalRevNum = parseFloat(totals.revenue) || 0;
  const avgRevPerTrip = totals.trips_count > 0 ? totalRevNum / totals.trips_count : 0;
  const avgRevPerPassenger = totals.passengers_count > 0 ? totalRevNum / totals.passengers_count : 0;

  // Chart data formatted
  const chartData = (summary?.by_day ?? []).map((day) => ({
    date: formatDate(day.date, { month: "short", day: "numeric" }),
    rawDate: day.date,
    revenue: parseFloat(day.revenue) || 0,
    passengers: day.passengers,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <NavIcon name="credit-card" className="h-5 w-5" />
            </span>
            Payments & Revenue
          </h1>
          <p className="text-sm text-muted-foreground">
            Financial reconciliation, route fare takings, passenger throughput, and daily revenue metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Addis Ababa (EAT)
          </Badge>
        </div>
      </div>

      {/* Date Range Filter Toolbar */}
      <Card className="border-border bg-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground mr-1">Period:</span>
            <Button
              variant={preset === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange("today")}
              className="h-8 text-xs"
            >
              Today
            </Button>
            <Button
              variant={preset === "7d" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange("7d")}
              className="h-8 text-xs"
            >
              Last 7 Days
            </Button>
            <Button
              variant={preset === "30d" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange("30d")}
              className="h-8 text-xs"
            >
              Last 30 Days
            </Button>
            <Button
              variant={preset === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange("all")}
              className="h-8 text-xs"
            >
              All Time
            </Button>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="rev-date-from" className="text-muted-foreground">From:</label>
              <Input
                id="rev-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPreset("all"); // custom
                }}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="rev-date-to" className="text-muted-foreground">To:</label>
              <Input
                id="rev-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPreset("all"); // custom
                }}
                className="h-8 w-36 text-xs"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <Card className="border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Revenue
                </span>
                <span className="rounded-md bg-success/10 p-1.5 text-success">
                  <NavIcon name="tag" className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mt-2">
                {formatETB(totals.revenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Settled fare transactions
              </p>
            </Card>

            <Card className="border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Passengers Transported
                </span>
                <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <NavIcon name="users" className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mt-2">
                {totals.passengers_count.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Avg. {formatETB(avgRevPerPassenger)} / passenger
              </p>
            </Card>

            <Card className="border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Completed Trips
                </span>
                <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <NavIcon name="calendar-clock" className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mt-2">
                {totals.trips_count.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Logged passenger journeys
              </p>
            </Card>

            <Card className="border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg. Revenue / Trip
                </span>
                <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <NavIcon name="bus" className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mt-2">
                {formatETB(avgRevPerTrip)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Per dispatched service
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Daily Revenue Recharts Chart */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Daily Revenue Trend</CardTitle>
              <CardDescription>
                Day-by-day revenue collection across the selected operating window.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              ETB
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              No revenue recorded for the selected date range.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="date"
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
                    tickFormatter={(val) => `${val} ETB`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    formatter={(value: unknown) => [
                      formatETB(typeof value === "number" || typeof value === "string" ? value : 0),
                      "Daily Revenue",
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdowns Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Revenue Breakdowns</CardTitle>
              <CardDescription>
                Detailed financial distribution segmented by corridor route, calendar day, and physical bus.
              </CardDescription>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/40">
              <Button
                variant={activeTab === "routes" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setActiveTab("routes")}
              >
                By Route ({summary?.by_route?.length ?? 0})
              </Button>
              <Button
                variant={activeTab === "days" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setActiveTab("days")}
              >
                By Day ({summary?.by_day?.length ?? 0})
              </Button>
              <Button
                variant={activeTab === "buses" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setActiveTab("buses")}
              >
                By Bus ({summary?.by_bus?.length ?? 0})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activeTab === "routes" ? (
            /* By Route Table */
            !summary?.by_route || summary.by_route.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No route breakdown data available for this range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Public Line #</TableHead>
                      <TableHead>Route Name</TableHead>
                      <TableHead className="text-right">Passengers</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Share of Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_route.map((item) => {
                      const itemRev = parseFloat(item.revenue) || 0;
                      const share = totalRevNum > 0 ? (itemRev / totalRevNum) * 100 : 0;
                      return (
                        <TableRow key={item.route_id}>
                          <TableCell className="font-bold text-foreground">
                            Line {item.public_bus_number}
                          </TableCell>
                          <TableCell className="text-foreground">{item.route_name}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            {item.passengers.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatETB(item.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-xs text-muted-foreground">
                              {share.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          ) : activeTab === "days" ? (
            /* By Day Table */
            !summary?.by_day || summary.by_day.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No daily breakdown data available for this range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Passengers Transported</TableHead>
                      <TableHead className="text-right">Daily Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_day.map((item) => (
                      <TableRow key={item.date}>
                        <TableCell className="font-medium text-foreground">
                          {formatDate(item.date, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {item.passengers.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatETB(item.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            /* By Bus Table */
            !summary?.by_bus || summary.by_bus.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No bus breakdown data available for this range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bus Plate (Targa)</TableHead>
                      <TableHead className="text-right">Passengers</TableHead>
                      <TableHead className="text-right">Revenue Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.by_bus.map((item) => (
                      <TableRow key={item.bus_id}>
                        <TableCell className="font-mono font-bold text-foreground">
                          {item.targa}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {item.passengers.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatETB(item.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentsAndRevenuePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading revenue metrics...</div>}>
      <PaymentsContent />
    </React.Suspense>
  );
}
