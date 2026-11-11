"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFares, useFareHistory, useCreateFare, type Fare } from "@/features/fares";
import { useRoutes } from "@/features/routes";
import {
  CreateFareSchema,
  type CreateFareFormData,
  type CreateFareFormInput,
} from "@/features/fares/schemas";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { NavIcon } from "@/shared/ui/icons";
import { formatDateTime } from "@/shared/lib/format";

function formatFareAmount(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num === null || num === undefined || Number.isNaN(num)) {
    return "0.00 ETB";
  }
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

export default function FaresPage() {
  const [selectedRouteFilter, setSelectedRouteFilter] = React.useState<string>("");
  const [isChangeDialogOpen, setIsChangeDialogOpen] = React.useState(false);

  // Queries
  const routesQuery = useRoutes();
  const routes = routesQuery.data || [];

  const faresQuery = useFares({ active: true });

  const historyQuery = useFareHistory();
  const filteredHistory = React.useMemo(() => {
    const history = historyQuery.data ?? [];
    return selectedRouteFilter
      ? history.filter((item) => item.route === selectedRouteFilter)
      : history;
  }, [historyQuery.data, selectedRouteFilter]);

  // Mutation
  const createFareMutation = useCreateFare();

  // Form
  const form = useForm<CreateFareFormInput, unknown, CreateFareFormData>({
    resolver: zodResolver(CreateFareSchema),
    defaultValues: {
      route: "",
      amount: 15,
    },
  });

  const onSubmit = async (data: CreateFareFormData) => {
    try {
      await createFareMutation.mutateAsync(data);
      setIsChangeDialogOpen(false);
      form.reset();
    } catch {
      // The mutation hook surfaces the backend error in a toast.
    }
  };

  const activeFareByRoute = React.useMemo(() => {
    const map = new Map<string, Fare>();
    for (const fare of faresQuery.data ?? []) {
      map.set(fare.route, fare);
    }
    return map;
  }, [faresQuery.data]);

  const handleOpenDialog = (
    preselectedRouteId?: string,
    currentAmount?: string
  ) => {
    const routeId = preselectedRouteId || routes[0]?.id || "";
    const existing = activeFareByRoute.get(routeId);
    const amount =
      currentAmount !== undefined
        ? parseFloat(currentAmount)
        : existing
          ? parseFloat(existing.amount)
          : 15;

    form.reset({
      route: routeId,
      amount: Number.isFinite(amount) ? amount : 15,
    });
    setIsChangeDialogOpen(true);
  };

  const handleRouteChange = (routeId: string) => {
    const existing = activeFareByRoute.get(routeId);
    form.setValue("route", routeId, { shouldValidate: true });
    form.setValue(
      "amount",
      existing ? parseFloat(existing.amount) : 15,
      { shouldValidate: true, shouldDirty: true }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <NavIcon name="tag" className="h-5 w-5" />
            </span>
            Fares & Tariffs
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage flat rate and corridor tariffs in ETB. Historical trip totals and reports remain unaffected by tariff changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2"
          >
            <span>+</span> Configure Route Fare
          </Button>
        </div>
      </div>

      {/* Route Fare Directory */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold">
            Route Fare Directory
          </CardTitle>
          <CardDescription>
            Every corridor has exactly one active tariff. Set a fare for routes
            showing “Unconfigured”; updating a fare archives the previous
            version.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {routesQuery.isLoading || faresQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <p className="text-sm">
                No routes exist yet. Create a route before configuring fares.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bus Line</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Active Fare</TableHead>
                    <TableHead>Effective Since</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => {
                    const fare = route.id
                      ? activeFareByRoute.get(route.id)
                      : undefined;

                    return (
                      <TableRow key={route.id}>
                        <TableCell>
                          <span className="bus-number-badge">
                            {route.public_bus_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold text-foreground">
                            {route.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {fare ? (
                            <span className="font-semibold text-foreground">
                              {formatFareAmount(fare.amount)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fare ? formatDateTime(fare.effective_from) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={fare ? "success" : "warning"}
                            className="text-[10px]"
                          >
                            {fare ? "Configured" : "Unconfigured"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={fare ? "outline" : "default"}
                            size="sm"
                            className="text-xs h-7"
                            onClick={() =>
                              handleOpenDialog(route.id, fare?.amount)
                            }
                          >
                            {fare ? "Update Fare" : "Set Fare"}
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

      {/* Fare History Audit Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Tariff Version History</CardTitle>
              <CardDescription>
                Auditable historical log of all fare changes with start and end timestamps.
              </CardDescription>
            </div>
            {/* Filter by Route */}
            <div className="flex items-center gap-2">
              <label htmlFor="route-filter" className="text-xs text-muted-foreground whitespace-nowrap">
                Filter Route:
              </label>
              <select
                id="route-filter"
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Line {r.public_bus_number} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historyQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <p className="text-sm">No fare history records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route / Line</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Configured By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => {
                    const isActive = !item.effective_to;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {item.public_bus_number ? (
                              <>
                                <span className="bus-number-badge">{item.public_bus_number}</span>
                                <span className="text-[11px] text-muted-foreground">line</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.route_name || item.route}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">
                            {formatFareAmount(item.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.effective_from)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.effective_to ? (
                            formatDateTime(item.effective_to)
                          ) : (
                            <span className="text-success font-medium">Ongoing (Current)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={isActive ? "active" : "inactive"}
                            label={isActive ? "Active" : "Archived"}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.configured_by_id ? item.configured_by_id.slice(0, 8) + "..." : "System"}
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

      {/* Change Fare Dialog */}
      <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Route Fare</DialogTitle>
            <DialogDescription>
              Adjust the passenger trip fare in Ethiopian Birr (ETB).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Route Selector */}
            <div className="space-y-1.5">
              <label htmlFor="route" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Target Route
              </label>
              <select
                id="route"
                value={form.watch("route")}
                onChange={(event) => handleRouteChange(event.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a corridor route...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Line {r.public_bus_number}: {r.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.route && (
                <p className="text-xs text-danger">{form.formState.errors.route.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Fare Amount (ETB)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 15.00"
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Notice Callout */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <span>ℹ️</span> Immutable Historical Record
              </div>
              <p>
                Updating this tariff automatically sets the previous version&apos;s effective end date.
                Historical trip reports, tickets issued, and cashier transactions remain completely unchanged.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFareMutation.isPending}
              >
                {createFareMutation.isPending ? "Updating Fare..." : "Save Tariff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
